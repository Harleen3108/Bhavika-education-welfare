import "server-only";
import { dbConnect } from "@/server/db/connect";
import { AdminLoginAttempt, AdminLockout, User } from "@/server/models";
import type { AdminAuthStage } from "@/server/models";
import { UserRole } from "@/lib/enums";
import { DomainError } from "@/server/errors";
import { getClientIp, hashIp } from "@/server/http/client-ip";
import { lookupIpIntel, describeLocation } from "./ip-intel.service";
import { sendAdminLockoutEmail, sendMemberLockoutEmail } from "./email.service";

/**
 * Brute-force protection for the admin panel.
 *
 * Five consecutive failures lock the identity, and each subsequent lockout is
 * twice as long as the last: 5, 10, 20, then 40 minutes. The level persists
 * after a lockout expires, so waiting one out does not reset the attacker to a
 * fresh five-minute penalty — only a successful sign-in clears it.
 */

export const MAX_FAILURES = 5;
/** Minutes served at each level. The final entry repeats for anything beyond. */
export const LOCKOUT_LADDER = [5, 10, 20, 40] as const;

/**
 * Members get twice the rope before the same ladder starts.
 *
 * Anyone who knows an address can burn another person's attempts, so a low
 * threshold on a member account is a denial-of-service against a child rather
 * than a defence of one. Ten is forgiving of a genuinely forgotten password
 * while still ending an automated guessing run quickly. Admin accounts keep the
 * tighter five: there are a handful of them, they hold every wallet on the
 * platform, and their owners can be unlocked by another admin.
 */
export const MAX_FAILURES_MEMBER = 10;

export function failureLimitFor(role: UserRole): number {
  return role === UserRole.ADMIN ? MAX_FAILURES : MAX_FAILURES_MEMBER;
}

export function lockoutMinutesFor(level: number): number {
  const i = Math.max(0, Math.min(level, LOCKOUT_LADDER.length) - 1);
  return LOCKOUT_LADDER[i];
}

export type LockState = {
  locked: boolean;
  until: Date | null;
  minutesRemaining: number;
  /** Failures still allowed before the next lockout. */
  remaining: number;
};

/** Read-only check used before doing any password work. */
export async function getLockState(
  email: string,
  role: UserRole = UserRole.ADMIN,
): Promise<LockState> {
  await dbConnect();
  const row = await AdminLockout.findOne({ email: email.toLowerCase() }).lean();
  const until = row?.lockedUntil ?? null;
  const locked = Boolean(until && until.getTime() > Date.now());

  return {
    locked,
    until: locked ? until : null,
    minutesRemaining: locked
      ? Math.max(1, Math.ceil((until!.getTime() - Date.now()) / 60000))
      : 0,
    remaining: Math.max(0, failureLimitFor(role) - (row?.failedCount ?? 0)),
  };
}

/** Throws if the identity is locked. Call before verifying any credential. */
export async function assertNotLocked(email: string): Promise<void> {
  const state = await getLockState(email);
  if (state.locked) {
    throw new DomainError(
      `Too many failed attempts. Try again in ${state.minutesRemaining} minute${state.minutesRemaining === 1 ? "" : "s"}.`,
      423,
      "ADMIN_LOCKED",
    );
  }
}

export type GpsFix = {
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  gpsAccuracy?: number | null;
  gpsStatus?: string | null;
};

type RecordArgs = {
  req: Request;
  email: string;
  stage: AdminAuthStage;
  success: boolean;
  reason?: string;
  /** Device position, when the browser gave one. A claim, not a fact. */
  gps?: GpsFix;
  /** Defaults to ADMIN so existing call sites keep their tighter threshold. */
  role?: UserRole;
};

/**
 * Write the attempt to the security log and move the lockout counter.
 *
 * Never throws: a logging or enrichment failure must not turn a correct
 * password into a failed sign-in, nor a wrong one into a successful one.
 */
export async function recordAdminAttempt({
  req,
  email,
  stage,
  success,
  reason,
  gps,
  role = UserRole.ADMIN,
}: RecordArgs): Promise<void> {
  try {
    await dbConnect();
    const lower = email.toLowerCase();
    const ip = getClientIp(req);
    const intel = await lookupIpIntel(req, ip);

    await AdminLoginAttempt.create({
      email: lower,
      role,
      success,
      stage,
      reason: reason ?? null,
      ip,
      ipHash: hashIp(ip),
      userAgent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
      ...intel,
      gpsLatitude: gps?.gpsLatitude ?? null,
      gpsLongitude: gps?.gpsLongitude ?? null,
      gpsAccuracy: gps?.gpsAccuracy ?? null,
      gpsStatus: gps?.gpsStatus ?? null,
    });

    if (success) {
      // A correct sign-in clears both the counter and the escalation level.
      await AdminLockout.deleteOne({ email: lower });
      return;
    }

    const row = await AdminLockout.findOneAndUpdate(
      { email: lower },
      {
        $inc: { failedCount: 1 },
        $set: { lastFailedAt: new Date(), lastIp: ip, role },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (row.failedCount < failureLimitFor(role)) return;

    // Threshold reached: serve the next rung of the ladder and reset the
    // counter so the following five failures escalate again.
    const level = row.level + 1;
    const minutes = lockoutMinutesFor(level);
    const until = new Date(Date.now() + minutes * 60_000);

    await AdminLockout.updateOne(
      { _id: row._id },
      { $set: { level, lockedUntil: until, failedCount: 0, notifiedAt: new Date() } },
    );

    await notifyLockout(lower, { minutes, level, ip, intel, role });
  } catch (e) {
    console.error("[admin-security] failed to record attempt:", e);
  }
}

/**
 * Warn the account owner that someone is trying to get in.
 *
 * Sent to the address under attack, and only to an address that actually
 * belongs to an admin — otherwise the endpoint becomes a way to mail arbitrary
 * strangers by typing their address into a login form.
 */
async function notifyLockout(
  email: string,
  ctx: {
    minutes: number;
    level: number;
    ip: string;
    intel: Awaited<ReturnType<typeof lookupIpIntel>>;
    role: UserRole;
  },
): Promise<void> {
  // Looked up rather than trusted: the address was typed into a login form, and
  // mailing whatever was typed would turn this into a way to send warnings to
  // strangers. Only a real account of the expected role is ever written to.
  const account = await User.findOne({ email, role: ctx.role })
    .select("name email")
    .lean();
  if (!account) return;

  const payload = {
    minutes: ctx.minutes,
    attempts: failureLimitFor(ctx.role),
    ip: ctx.ip,
    location: describeLocation(ctx.intel),
    vpnSuspected: ctx.intel.vpnSuspected,
    org: ctx.intel.org,
    at: new Date(),
  };

  const send =
    ctx.role === UserRole.ADMIN
      ? sendAdminLockoutEmail(account.email, account.name, payload)
      : sendMemberLockoutEmail(account.email, account.name, payload);

  await send.catch((e: unknown) =>
    console.error("[admin-security] lockout email failed:", e),
  );
}

/** Admin-facing: clear a lockout by hand. */
export async function clearAdminLockout(email: string): Promise<void> {
  await dbConnect();
  await AdminLockout.deleteOne({ email: email.toLowerCase() });
}

export type AttemptRow = {
  id: string;
  email: string;
  success: boolean;
  stage: AdminAuthStage;
  reason: string | null;
  ip: string;
  userAgent: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsAccuracy: number | null;
  gpsStatus: string | null;
  org: string | null;
  vpnSuspected: boolean;
  vpnReason: string | null;
  createdAt: Date;
};

export type LockRow = {
  email: string;
  level: number;
  failedCount: number;
  lockedUntil: Date | null;
  minutesRemaining: number;
  lastIp: string | null;
  lastFailedAt: Date | null;
};

export type SecurityOverview = {
  attempts: AttemptRow[];
  locks: LockRow[];
  counts: { failures24h: number; vpn24h: number; distinctIps24h: number };
};

/** Everything the admin security screen renders, in one round trip per shape. */
export async function getSecurityOverview(limit = 50): Promise<SecurityOverview> {
  await dbConnect();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [rows, locks, failures24h, vpn24h, ips] = await Promise.all([
    AdminLoginAttempt.find().sort({ createdAt: -1 }).limit(limit).lean(),
    AdminLockout.find().sort({ updatedAt: -1 }).lean(),
    AdminLoginAttempt.countDocuments({ success: false, createdAt: { $gte: since } }),
    AdminLoginAttempt.countDocuments({ vpnSuspected: true, createdAt: { $gte: since } }),
    AdminLoginAttempt.distinct("ip", { createdAt: { $gte: since } }),
  ]);

  return {
    attempts: rows.map((r) => ({
      id: r._id.toString(),
      email: r.email,
      success: r.success,
      stage: r.stage,
      reason: r.reason ?? null,
      ip: r.ip,
      userAgent: r.userAgent ?? null,
      location: describeLocation(r),
      latitude: r.latitude ?? null,
      longitude: r.longitude ?? null,
      gpsLatitude: r.gpsLatitude ?? null,
      gpsLongitude: r.gpsLongitude ?? null,
      gpsAccuracy: r.gpsAccuracy ?? null,
      gpsStatus: r.gpsStatus ?? null,
      org: r.org ?? null,
      vpnSuspected: r.vpnSuspected,
      vpnReason: r.vpnReason ?? null,
      createdAt: r.createdAt,
    })),
    locks: locks.map((l) => {
      const ms = l.lockedUntil ? l.lockedUntil.getTime() - Date.now() : 0;
      return {
        email: l.email,
        level: l.level,
        failedCount: l.failedCount,
        lockedUntil: ms > 0 ? l.lockedUntil : null,
        minutesRemaining: ms > 0 ? Math.max(1, Math.ceil(ms / 60000)) : 0,
        lastIp: l.lastIp ?? null,
        lastFailedAt: l.lastFailedAt ?? null,
      };
    }),
    counts: { failures24h, vpn24h, distinctIps24h: ips.length },
  };
}
