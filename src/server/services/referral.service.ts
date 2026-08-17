import "server-only";
import type { ClientSession, Types } from "mongoose";
import { customAlphabet } from "nanoid";
import { dbConnect } from "@/server/db/connect";
import { User, Referral, QuizAttempt } from "@/server/models";
import { ReferralStatus, AccountStatus, AttemptStatus, PointSource } from "@/lib/enums";
import { REFERRAL_CODE_LENGTH } from "@/lib/constants";
import { SITE } from "@/lib/constants";
import { env } from "@/lib/env";
import { getSettings } from "./content.service";
import { creditPoints } from "./wallet.service";
import { toDisplayName } from "@/lib/utils";

// Unambiguous alphabet (no O/0/I/1) for human-shareable codes.
const genCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", REFERRAL_CODE_LENGTH);

/** Generate a referral code that is not already taken. */
export async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = genCode();
    const exists = await User.exists({ referralCode: code });
    if (!exists) return code;
  }
  // Extremely unlikely; widen with a suffix.
  return `${genCode()}${Math.floor(Date.now() % 100)}`;
}

/** Resolve a referral code to a referrer user id (or null). */
export async function resolveReferrer(code?: string | null): Promise<Types.ObjectId | null> {
  if (!code) return null;
  const referrer = await User.findOne({ referralCode: code.toUpperCase() }).select("_id");
  return referrer ? (referrer._id as Types.ObjectId) : null;
}

/**
 * Record a PENDING referral relationship at signup. Guarded by the unique index
 * on `referredUser`, so a user can only ever be referred once. Self-referral is
 * rejected by the caller (referrer id must differ from referred id).
 */
export async function recordReferral(
  referrerId: Types.ObjectId,
  referredUserId: Types.ObjectId,
  code: string,
  session?: ClientSession,
): Promise<void> {
  if (referrerId.equals(referredUserId)) return; // no self-referral
  await Referral.create(
    [
      {
        referrer: referrerId,
        referredUser: referredUserId,
        referralCode: code.toUpperCase(),
        status: ReferralStatus.PENDING,
      },
    ],
    { session },
  );
}

/**
 * Evaluate — and if eligible, pay out — the referral that invited `referredUserId`.
 * Called after the referred user verifies their email and after they complete a
 * quiz. Safe to call repeatedly: the reward is paid exactly once.
 *
 * Fraud guards:
 *  - self-referral is impossible (never recorded).
 *  - one referral row per referred user (unique index).
 *  - single reward via an atomic PENDING/QUALIFIED → REWARDED transition.
 *  - wallet credits are idempotency-keyed on the referral id.
 */
export async function processReferralReward(
  referredUserId: string,
): Promise<{ rewarded: boolean; reason?: string }> {
  await dbConnect();

  const referral = await Referral.findOne({
    referredUser: referredUserId,
    status: { $in: [ReferralStatus.PENDING, ReferralStatus.QUALIFIED] },
  });
  if (!referral) return { rewarded: false, reason: "NO_PENDING_REFERRAL" };

  // Never reward a self-referral (defensive).
  if (referral.referrer.toString() === referredUserId) {
    referral.status = ReferralStatus.REJECTED;
    referral.rejectionReason = "SELF_REFERRAL";
    await referral.save();
    return { rewarded: false, reason: "SELF_REFERRAL" };
  }

  const settings = await getSettings();
  const rules = settings.referral;

  const referred = await User.findById(referredUserId).select("status emailVerified").lean();
  if (!referred) return { rewarded: false, reason: "NO_USER" };

  // Eligibility rules (configurable).
  if (rules.requireEmailVerification) {
    const verified = referred.status === AccountStatus.ACTIVE || Boolean(referred.emailVerified);
    if (!verified) return { rewarded: false, reason: "EMAIL_NOT_VERIFIED" };
  }
  if (rules.requireFirstQuiz) {
    const didQuiz = await QuizAttempt.exists({
      user: referredUserId,
      status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED] },
    });
    if (!didQuiz) {
      // Mark QUALIFIED progress? Keep PENDING until fully eligible.
      return { rewarded: false, reason: "FIRST_QUIZ_REQUIRED" };
    }
  }

  const now = new Date();
  const rewardPoints = rules.referrerReward;

  // Atomic single-reward guard.
  const transitioned = await Referral.findOneAndUpdate(
    { _id: referral._id, status: { $in: [ReferralStatus.PENDING, ReferralStatus.QUALIFIED] } },
    {
      $set: {
        status: ReferralStatus.REWARDED,
        qualifiedAt: referral.qualifiedAt ?? now,
        rewardedAt: now,
        rewardPoints,
      },
    },
    { new: true },
  );
  if (!transitioned) return { rewarded: false, reason: "ALREADY_REWARDED" };

  // Credit the referrer (exactly once).
  if (rewardPoints > 0) {
    await creditPoints({
      userId: transitioned.referrer,
      source: PointSource.REFERRAL,
      points: rewardPoints,
      referenceType: "Referral",
      referenceId: transitioned._id,
      description: "Referral reward — a friend you invited joined and participated",
      idempotencyKey: `referral:${transitioned._id.toString()}`,
    });
  }

  // Optionally reward the referred user too.
  if (rules.referredReward > 0) {
    await creditPoints({
      userId: referredUserId,
      source: PointSource.REFERRAL,
      points: rules.referredReward,
      referenceType: "Referral",
      referenceId: transitioned._id,
      description: "Welcome bonus — thanks for joining via a referral",
      idempotencyKey: `referral-referred:${transitioned._id.toString()}`,
    });
  }

  return { rewarded: true };
}

// ---------- Referral overview (dashboard) ----------
export type ReferralOverview = {
  code: string;
  shareLink: string;
  perReferralPoints: number;
  stats: { total: number; pending: number; rewarded: number; pointsEarned: number };
  referrals: {
    id: string;
    name: string;
    status: string;
    joinedAt: string;
    rewardedAt: string | null;
    rewardPoints: number;
  }[];
};

export async function getReferralOverview(userId: string): Promise<ReferralOverview> {
  await dbConnect();
  const base = env.SITE_URL || SITE.url;

  const [user, settings, referrals] = await Promise.all([
    User.findById(userId).select("referralCode").lean(),
    getSettings(),
    Referral.find({ referrer: userId })
      .sort({ createdAt: -1 })
      .populate<{ referredUser: { name: string } }>("referredUser", "name")
      .lean(),
  ]);

  const code = user?.referralCode ?? "";
  let pending = 0;
  let rewarded = 0;
  let pointsEarned = 0;
  for (const r of referrals) {
    if (r.status === ReferralStatus.PENDING || r.status === ReferralStatus.QUALIFIED) pending += 1;
    if (r.status === ReferralStatus.REWARDED) {
      rewarded += 1;
      pointsEarned += r.rewardPoints ?? 0;
    }
  }

  return {
    code,
    shareLink: `${base}/register?ref=${code}`,
    perReferralPoints: settings.referral.referrerReward,
    stats: { total: referrals.length, pending, rewarded, pointsEarned },
    referrals: referrals.map((r) => ({
      id: r._id.toString(),
      name: r.referredUser ? toDisplayName(r.referredUser.name) : "New member",
      status: r.status,
      joinedAt: r.createdAt.toISOString(),
      rewardedAt: r.rewardedAt ? r.rewardedAt.toISOString() : null,
      rewardPoints: r.rewardPoints ?? 0,
    })),
  };
}
