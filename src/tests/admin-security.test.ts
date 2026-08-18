import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminLockout, AdminLoginAttempt, User } from "@/server/models";
import { UserRole } from "@/lib/enums";
import { makeUser } from "./helpers";

// The lockout email is not under test and must not reach the network.
vi.mock("@/server/services/email.service", () => ({
  sendAdminLockoutEmail: vi.fn(async () => ({ ok: true, provider: "console" })),
  sendVerificationEmail: vi.fn(async () => ({ ok: true, provider: "console" })),
  sendPasswordResetEmail: vi.fn(async () => ({ ok: true, provider: "console" })),
  sendReferralJoinedEmail: vi.fn(async () => ({ ok: true, provider: "console" })),
}));

const {
  recordAdminAttempt,
  getLockState,
  assertNotLocked,
  clearAdminLockout,
  lockoutMinutesFor,
  MAX_FAILURES,
} = await import("@/server/services/admin-security.service");

/** A request carrying no edge geo headers, as in local development. */
const req = () =>
  new Request("https://example.test/api/auth/admin/verify-password", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.7", "user-agent": "vitest" },
  });

async function failTimes(email: string, n: number) {
  for (let i = 0; i < n; i += 1) {
    await recordAdminAttempt({ req: req(), email, stage: "PASSWORD", success: false });
  }
}

describe("admin lockout ladder", () => {
  let email: string;

  beforeEach(async () => {
    // Call counts are asserted below, so the mock must not carry them between
    // tests — the shared module instance persists across the whole file.
    vi.clearAllMocks();
    const u = await makeUser({ role: UserRole.ADMIN });
    email = u.email;
  });

  it("escalates 5 → 10 → 20 → 40 minutes", () => {
    expect(lockoutMinutesFor(1)).toBe(5);
    expect(lockoutMinutesFor(2)).toBe(10);
    expect(lockoutMinutesFor(3)).toBe(20);
    expect(lockoutMinutesFor(4)).toBe(40);
    // Beyond the ladder the longest penalty repeats rather than growing forever.
    expect(lockoutMinutesFor(9)).toBe(40);
  });

  it("does not lock before the threshold", async () => {
    await failTimes(email, MAX_FAILURES - 1);
    const s = await getLockState(email);
    expect(s.locked).toBe(false);
    expect(s.remaining).toBe(1);
    await expect(assertNotLocked(email)).resolves.toBeUndefined();
  });

  it("locks for 5 minutes on the fifth failure", async () => {
    await failTimes(email, MAX_FAILURES);
    const s = await getLockState(email);
    expect(s.locked).toBe(true);
    expect(s.minutesRemaining).toBeGreaterThan(0);
    expect(s.minutesRemaining).toBeLessThanOrEqual(5);
    await expect(assertNotLocked(email)).rejects.toMatchObject({ code: "ADMIN_LOCKED" });
  });

  it("serves a longer lockout each round, and waiting one out does not reset it", async () => {
    const expected = [5, 10, 20, 40];
    for (const minutes of expected) {
      await failTimes(email, MAX_FAILURES);
      const row = await AdminLockout.findOne({ email }).lean();
      const ms = row!.lockedUntil!.getTime() - Date.now();
      expect(Math.ceil(ms / 60000)).toBe(minutes);

      // Serve the sentence. The level must survive it.
      await AdminLockout.updateOne({ email }, { $set: { lockedUntil: new Date(0) } });
      expect((await getLockState(email)).locked).toBe(false);
    }
    expect((await AdminLockout.findOne({ email }).lean())!.level).toBe(4);
  });

  it("clears the counter and the level on a successful sign-in", async () => {
    await failTimes(email, MAX_FAILURES);
    expect((await getLockState(email)).locked).toBe(true);

    await AdminLockout.updateOne({ email }, { $set: { lockedUntil: new Date(0) } });
    await recordAdminAttempt({ req: req(), email, stage: "SESSION", success: true });

    expect(await AdminLockout.findOne({ email }).lean()).toBeNull();

    // The next lockout starts at the bottom of the ladder again.
    await failTimes(email, MAX_FAILURES);
    const row = await AdminLockout.findOne({ email }).lean();
    expect(row!.level).toBe(1);
  });

  it("writes every attempt to the security log with its address", async () => {
    await failTimes(email, 2);
    await recordAdminAttempt({ req: req(), email, stage: "SESSION", success: true });

    const rows = await AdminLoginAttempt.find({ email }).sort({ createdAt: 1 }).lean();
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.success)).toEqual([false, false, true]);
    expect(rows[0].ip).toBe("203.0.113.7");
    expect(rows[0].ipHash).toBeTruthy();
    // The raw address is kept for investigation, but never in place of the hash.
    expect(rows[0].ipHash).not.toBe(rows[0].ip);
  });

  it("can be released by hand", async () => {
    await failTimes(email, MAX_FAILURES);
    expect((await getLockState(email)).locked).toBe(true);
    await clearAdminLockout(email);
    expect((await getLockState(email)).locked).toBe(false);
  });

  it("never emails a lockout warning to a non-admin address", async () => {
    const { sendAdminLockoutEmail } = await import("@/server/services/email.service");
    const stranger = "not-an-admin@test.dev";
    await failTimes(stranger, MAX_FAILURES);
    // The identity still locks — we must not reveal whether it exists — but no
    // mail goes to an address that never belonged to an administrator.
    expect((await getLockState(stranger)).locked).toBe(true);
    expect(sendAdminLockoutEmail).not.toHaveBeenCalled();
  });

  it("emails the admin when their own account locks", async () => {
    const { sendAdminLockoutEmail } = await import("@/server/services/email.service");
    await failTimes(email, MAX_FAILURES);
    expect(sendAdminLockoutEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendAdminLockoutEmail).mock.calls[0][0]).toBe(email);
  });
});

describe("admin user fixture", () => {
  it("is actually an admin", async () => {
    const u = await makeUser({ role: UserRole.ADMIN });
    const found = await User.findById(u._id).lean();
    expect(found?.role).toBe(UserRole.ADMIN);
  });
});
