import "server-only";
import type { ClientSession, HydratedDocument } from "mongoose";
import { customAlphabet } from "nanoid";
import { dbConnect, withTransaction } from "@/server/db/connect";
import { Coupon, User, Wallet, WalletTransaction, type ICoupon, type IWallet } from "@/server/models";
import {
  CouponStatus,
  CouponSource,
  PointSource,
  TransactionType,
  TransactionStatus,
} from "@/lib/enums";
import { COUPON_CODE } from "@/lib/constants";
import { DomainError } from "@/server/errors";
import { formatCouponCode, normalizeCouponCode, COUPON_CODE_BODY_LENGTH } from "@/lib/validation/coupon";
import { getSettings } from "./content.service";
import { pointsToRupees } from "./integration.service";

const DAY_MS = 86_400_000;

// crypto-backed (nanoid), never Math.random — a guessable coupon code is money
// anyone can mint.
const genCodeBody = customAlphabet(COUPON_CODE.alphabet, COUPON_CODE_BODY_LENGTH);

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

export type CouponDTO = {
  id: string;
  code: string;
  valueRupees: number;
  pointsSpent: number;
  /**
   * EFFECTIVE status. An ACTIVE row whose `expiresAt` has passed reports
   * EXPIRED here even before the sweep has flipped it, so a member is never
   * shown a coupon as usable when a shopkeeper would refuse it.
   */
  status: CouponStatus;
  source: CouponSource;
  issuedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  /** Set when an admin returned the points on a void or force-expire. */
  refundedAt: string | null;
  externalRef: string | null;
  /** Whole days left before forfeit. 0 once redeemed or expired. */
  daysRemaining: number;
};

export type CouponInvalidReason = "NOT_FOUND" | "ALREADY_REDEEMED" | "EXPIRED" | "VOID";

export type CouponValidation = {
  valid: boolean;
  /** null when `valid` is true. */
  reason: CouponInvalidReason | null;
  /** Present whenever the code resolved to a real coupon, valid or not. */
  coupon: CouponDTO | null;
};

/** The live rules a member must be shown BEFORE they generate anything. */
export type CouponPolicy = {
  enabled: boolean;
  minRedeemPoints: number;
  pointsPerRupee: number;
  redeemStepPoints: number;
  validityDays: number;
};

export type ExpirySweepResult = {
  expired: number;
  /** Points forfeited by this sweep. Never refunded — reported so it is countable. */
  pointsForfeited: number;
};

/* ========================================================================== */
/*                                  Helpers                                   */
/* ========================================================================== */

/** Effective status: stored status, except an ACTIVE row past its expiry. */
function effectiveStatus(coupon: ICoupon, now: Date): CouponStatus {
  if (coupon.status === CouponStatus.ACTIVE && coupon.expiresAt.getTime() <= now.getTime()) {
    return CouponStatus.EXPIRED;
  }
  return coupon.status;
}

function toDTO(coupon: ICoupon, now = new Date()): CouponDTO {
  const status = effectiveStatus(coupon, now);
  const msLeft = coupon.expiresAt.getTime() - now.getTime();
  return {
    id: coupon._id.toString(),
    code: coupon.code,
    valueRupees: coupon.valueRupees,
    pointsSpent: coupon.pointsSpent,
    status,
    source: coupon.source,
    issuedAt: coupon.issuedAt.toISOString(),
    expiresAt: coupon.expiresAt.toISOString(),
    redeemedAt: coupon.redeemedAt ? coupon.redeemedAt.toISOString() : null,
    refundedAt: coupon.refundedAt ? coupon.refundedAt.toISOString() : null,
    externalRef: coupon.externalRef ?? null,
    daysRemaining: status === CouponStatus.ACTIVE ? Math.max(0, Math.ceil(msLeft / DAY_MS)) : 0,
  };
}

/**
 * Allocate a code that is not already taken.
 *
 * The pre-check is a courtesy that keeps the common path clean; the unique
 * index on `code` is the actual guarantee, since a read inside a transaction
 * cannot see a code a concurrent transaction is about to commit. Six misses
 * over a ~1.15e18 space means something is wrong with the generator, so this
 * fails loudly rather than falling back to a code that would not match the
 * documented format the partner store parses.
 */
async function generateUniqueCouponCode(session: ClientSession): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = formatCouponCode(genCodeBody());
    const exists = await Coupon.exists({ code }).session(session);
    if (!exists) return code;
  }
  throw new DomainError(
    "We couldn't allocate a coupon code just now. Please try again.",
    503,
    "CODE_ALLOCATION",
  );
}

/**
 * Decide which sub-balances a spend comes out of.
 *
 * Wallet sub-balances must always sum to `totalBalance`, so a debit has to be
 * charged to specific buckets. They are drained oldest-purpose-first (quiz,
 * referral, activity) rather than all from one bucket, because the buckets are
 * surfaced to the member as a breakdown and a bucket showing -5,000 reads as a
 * bug in their wallet.
 *
 * Any remainder (only possible if legacy rows broke the sum invariant) is
 * charged to activity so `totalBalance` stays correct — the total is the number
 * that governs what a member can actually spend.
 */
function planBucketDebit(
  wallet: Pick<IWallet, "quizBalance" | "referralBalance" | "activityBalance">,
  points: number,
): { quiz: number; referral: number; activity: number } {
  let left = points;
  const take = (available: number): number => {
    const amount = Math.max(0, Math.min(left, available));
    left -= amount;
    return amount;
  };
  const quiz = take(wallet.quizBalance);
  const referral = take(wallet.referralBalance);
  const activity = take(wallet.activityBalance);
  return { quiz, referral, activity: activity + left };
}

/* ========================================================================== */
/*                                   Policy                                   */
/* ========================================================================== */

/**
 * The live coupon rules. Every member-facing surface should render the forfeit
 * warning from `validityDays` BEFORE offering the generate button — a forfeit
 * nobody was warned about is how a family stops trusting the platform.
 */
export async function getCouponPolicy(): Promise<CouponPolicy> {
  const settings = await getSettings();
  const { redemptionEnabled, minRedeemPoints, pointsPerRupee, redeemStepPoints, couponValidityDays } =
    settings.integration;
  return {
    enabled: redemptionEnabled,
    minRedeemPoints,
    pointsPerRupee,
    redeemStepPoints,
    validityDays: couponValidityDays,
  };
}

/* ========================================================================== */
/*                                  Issuing                                   */
/* ========================================================================== */

/**
 * Convert points into a coupon.
 *
 * THE ATOMICITY IS THE POINT. The balance re-read, the debit and the coupon
 * insert all happen inside one Mongo transaction, so the window the old
 * redirect-then-callback design left open — pass the balance check in ten tabs,
 * get ten coupons, land at -45,000 points — does not exist. The
 * `totalBalance: { $gte: points }` guard on the update is the zero floor: a
 * loser of the race either write-conflicts (the driver retries the callback
 * against fresh data and it then fails the balance check honestly) or matches
 * no document and is rejected.
 *
 * Note on `creditPoints`: the ledger primitive in wallet.service opens its OWN
 * session via `withTransaction`, so calling it from here would put the debit in
 * a different transaction from the coupon insert and reintroduce exactly the
 * split this function exists to close. The debit is therefore written inline,
 * keeping creditPoints' contract — signed `points`, `balanceAfter`, and a
 * unique `idempotencyKey` (`coupon:<code>`) — so the ledger stays uniform.
 */
export async function issueCoupon(userId: string, points: number): Promise<CouponDTO> {
  await dbConnect();
  const policy = await getCouponPolicy();

  if (!policy.enabled) {
    throw new DomainError(
      "Coupons aren't available yet. Coming soon!",
      403,
      "REDEMPTION_DISABLED",
    );
  }

  // The per-member override sits on top of the global switch: an admin can stop
  // one account converting points without disabling coupons for everyone. Read
  // here, before any balance work, so a blocked member is turned away cleanly.
  const account = await User.findById(userId).select("redemptionBlocked").lean();
  if (account?.redemptionBlocked) {
    throw new DomainError(
      "Coupon generation is turned off for your account. Please contact support.",
      403,
      "REDEMPTION_BLOCKED",
    );
  }

  // Re-checked against live settings on every call. The client is shown these
  // numbers but is never the authority on them.
  if (!Number.isInteger(points) || points <= 0) {
    throw new DomainError("Enter a whole number of points.", 400, "INVALID_AMOUNT");
  }
  if (points < policy.minRedeemPoints) {
    throw new DomainError(
      `You need at least ${policy.minRedeemPoints.toLocaleString("en-IN")} points for a coupon.`,
      400,
      "MIN_REDEEM",
    );
  }
  if (policy.redeemStepPoints > 0 && points % policy.redeemStepPoints !== 0) {
    throw new DomainError(
      `Coupons are issued in multiples of ${policy.redeemStepPoints.toLocaleString("en-IN")} points.`,
      400,
      "STEP_REDEEM",
    );
  }

  const valueRupees = pointsToRupees(points, policy.pointsPerRupee);
  if (valueRupees <= 0) {
    // Only reachable from a hand-edited settings document; issuing a ₹0 coupon
    // would take the points and hand back nothing.
    throw new DomainError(
      "Coupon values aren't configured correctly yet. Please contact support.",
      503,
      "BAD_RATE",
    );
  }

  const coupon = await withTransaction(async (session) => {
    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet || wallet.totalBalance < points) {
      throw new DomainError("You don't have enough points for this coupon.", 400, "INSUFFICIENT");
    }

    const plan = planBucketDebit(wallet, points);
    const debited = await Wallet.findOneAndUpdate(
      { _id: wallet._id, totalBalance: { $gte: points } },
      {
        $inc: {
          totalBalance: -points,
          quizBalance: -plan.quiz,
          referralBalance: -plan.referral,
          activityBalance: -plan.activity,
        },
      },
      { new: true, session },
    );
    if (!debited) {
      throw new DomainError("You don't have enough points for this coupon.", 400, "INSUFFICIENT");
    }

    const code = await generateUniqueCouponCode(session);
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + policy.validityDays * DAY_MS);

    const [created] = await Coupon.create(
      [
        {
          code,
          user: wallet.user,
          valueRupees,
          pointsSpent: points,
          status: CouponStatus.ACTIVE,
          source: CouponSource.POINTS,
          issuedAt,
          expiresAt,
        },
      ],
      { session },
    );

    await WalletTransaction.create(
      [
        {
          user: wallet.user,
          source: PointSource.FUTURE_REDEMPTION,
          type: TransactionType.DEBIT,
          points: -points,
          balanceAfter: debited.totalBalance,
          referenceType: "Coupon",
          referenceId: created._id,
          // Named so the member's wallet history reads as an explanation rather
          // than a mystery deduction.
          description: `Coupon ${code} issued — worth ₹${valueRupees.toLocaleString("en-IN")}`,
          status: TransactionStatus.COMPLETED,
          idempotencyKey: `coupon:${code}`,
          meta: { couponCode: code, valueRupees },
        },
      ],
      { session },
    );

    return created;
  });

  return toDTO(coupon);
}

/* ========================================================================== */
/*                                  Reading                                   */
/* ========================================================================== */

/** A member's coupons, newest first. */
export async function listCoupons(userId: string): Promise<CouponDTO[]> {
  await dbConnect();
  const docs = await Coupon.find({ user: userId }).sort({ issuedAt: -1 }).lean();
  const now = new Date();
  return docs.map((d) => toDTO(d as ICoupon, now));
}

/** Look a coupon up by code in any typed form. Null when no such coupon exists. */
export async function getCouponByCode(code: string): Promise<CouponDTO | null> {
  await dbConnect();
  const doc = await Coupon.findOne({ code: normalizeCouponCode(code) }).lean();
  return doc ? toDTO(doc as ICoupon) : null;
}

/**
 * Read-only check for the partner store's till. Never mutates anything, so it
 * is safe to call on every keystroke of a code entry field.
 */
export async function validateCoupon(code: string): Promise<CouponValidation> {
  await dbConnect();
  const doc = await Coupon.findOne({ code: normalizeCouponCode(code) }).lean();
  if (!doc) return { valid: false, reason: "NOT_FOUND", coupon: null };

  const dto = toDTO(doc as ICoupon);
  if (dto.status === CouponStatus.REDEEMED) {
    return { valid: false, reason: "ALREADY_REDEEMED", coupon: dto };
  }
  if (dto.status === CouponStatus.EXPIRED) {
    return { valid: false, reason: "EXPIRED", coupon: dto };
  }
  // Deactivated by an admin: a real coupon a store must nonetheless refuse.
  if (dto.status === CouponStatus.VOID) {
    return { valid: false, reason: "VOID", coupon: dto };
  }
  return { valid: true, reason: null, coupon: dto };
}

/* ========================================================================== */
/*                                 Redeeming                                  */
/* ========================================================================== */

/**
 * Mark a coupon spent. Called by the partner store, so it must be exactly once
 * even under a retried request.
 *
 * The guarantee is the conditional update itself: a single-document
 * findOneAndUpdate is atomic, and the filter demands ACTIVE *and* an expiry
 * still in the future. Only one caller can ever match, so a coupon cannot be
 * redeemed twice, and cannot be redeemed after expiry even if the sweep has not
 * run yet. The follow-up read exists only to say WHY it failed.
 */
export async function redeemCoupon(code: string, externalRef: string): Promise<CouponDTO> {
  await dbConnect();
  const normalized = normalizeCouponCode(code);
  const ref = externalRef.trim();
  if (!ref) {
    throw new DomainError("An order reference is required.", 400, "MISSING_REFERENCE");
  }

  const now = new Date();
  const redeemed = await Coupon.findOneAndUpdate(
    { code: normalized, status: CouponStatus.ACTIVE, expiresAt: { $gt: now } },
    { $set: { status: CouponStatus.REDEEMED, redeemedAt: now, externalRef: ref } },
    { new: true },
  );
  if (redeemed) return toDTO(redeemed, now);

  const existing = await Coupon.findOne({ code: normalized }).lean();
  if (!existing) {
    throw new DomainError("That coupon code doesn't exist.", 404, "NOT_FOUND");
  }
  if (existing.status === CouponStatus.REDEEMED) {
    throw new DomainError("That coupon has already been used.", 409, "ALREADY_REDEEMED");
  }
  if (existing.status === CouponStatus.VOID) {
    throw new DomainError("That coupon has been cancelled and cannot be used.", 409, "VOID");
  }
  if (existing.status === CouponStatus.EXPIRED || existing.expiresAt.getTime() <= now.getTime()) {
    throw new DomainError("That coupon has expired.", 410, "EXPIRED");
  }
  // Still ACTIVE and still in date, yet the update matched nothing: another
  // request took it between our update and this read. Reported as used rather
  // than as the expiry it plainly is not — a till operator told "expired" about
  // a coupon issued yesterday would send the family away for the wrong reason.
  throw new DomainError("That coupon has already been used.", 409, "ALREADY_REDEEMED");
}

/* ========================================================================== */
/*                                  Expiry                                    */
/* ========================================================================== */

/**
 * Flip lapsed coupons to EXPIRED. Intended for a scheduled sweep.
 *
 * NO REFUND — the client's decision: an unused coupon is forfeited. That makes
 * writing the forfeit down non-negotiable. Each expiry gets a zero-point ledger
 * row in the member's own wallet history, next to the debit that created the
 * coupon, because the member's wallet is the one place they will actually look
 * for "where did my 5,000 points go". Points are unchanged; the row carries the
 * explanation, not a balance change.
 *
 * The status flip and its ledger row share one transaction per coupon, so a
 * crash mid-sweep can never leave a coupon quietly expired with no record. The
 * conditional filter means a re-run skips coupons already handled.
 */
export async function expireCoupons(now = new Date()): Promise<ExpirySweepResult> {
  await dbConnect();

  const due = await Coupon.find({
    status: CouponStatus.ACTIVE,
    expiresAt: { $lte: now },
  })
    .select("_id")
    .lean();

  let expired = 0;
  let pointsForfeited = 0;

  for (const { _id } of due) {
    const forfeited = await withTransaction<number | null>(async (session) => {
      const coupon = await Coupon.findOneAndUpdate(
        { _id, status: CouponStatus.ACTIVE, expiresAt: { $lte: now } },
        { $set: { status: CouponStatus.EXPIRED } },
        { new: true, session },
      );
      if (!coupon) return null; // another sweep won it

      const wallet = await Wallet.findOne({ user: coupon.user }).session(session);
      await WalletTransaction.create(
        [
          {
            user: coupon.user,
            source: PointSource.FUTURE_REDEMPTION,
            type: TransactionType.DEBIT,
            // Zero: the points left the wallet when the coupon was issued. This
            // row records the forfeit, it does not perform it.
            points: 0,
            balanceAfter: wallet?.totalBalance ?? 0,
            referenceType: "Coupon",
            referenceId: coupon._id,
            description: `Coupon ${coupon.code} expired unused — the ${coupon.pointsSpent.toLocaleString("en-IN")} points spent on it were not returned`,
            status: TransactionStatus.COMPLETED,
            idempotencyKey: `coupon-expiry:${coupon.code}`,
            meta: { couponCode: coupon.code, pointsForfeited: coupon.pointsSpent },
          },
        ],
        { session },
      );

      return coupon.pointsSpent;
    });

    if (forfeited !== null) {
      expired += 1;
      pointsForfeited += forfeited;
    }
  }

  return { expired, pointsForfeited };
}

/* ========================================================================== */
/*                              Admin operations                              */
/* ========================================================================== */

export type AdminIssueMode = "PROMO" | "POINTS";

export type AdminIssueCouponInput = {
  userId: string;
  /** Face value in whole rupees the admin is granting or converting. */
  valueRupees: number;
  /**
   * PROMO — a free coupon the member pays nothing for (source ADMIN).
   * POINTS — issued on the member's behalf against their own points, at the
   * live rate, exactly as if they had generated it themselves (source POINTS).
   */
  mode: AdminIssueMode;
  adminId: string;
};

/**
 * Why a `findOneAndUpdate` that gated on ACTIVE matched nothing. Read AFTER the
 * conditional update failed, only to produce a precise message — the update,
 * not this read, is the authority on the state.
 */
async function couponStateError(couponId: string, now: Date): Promise<DomainError> {
  const doc = await Coupon.findById(couponId).lean();
  if (!doc) return new DomainError("That coupon no longer exists.", 404, "NOT_FOUND");
  if (doc.status === CouponStatus.REDEEMED) {
    return new DomainError("That coupon has already been redeemed at the store.", 409, "REDEEMED");
  }
  if (doc.status === CouponStatus.VOID) {
    return new DomainError("That coupon is already deactivated.", 409, "ALREADY_VOID");
  }
  if (doc.status === CouponStatus.EXPIRED || doc.expiresAt.getTime() <= now.getTime()) {
    return new DomainError("That coupon has already expired.", 409, "ALREADY_EXPIRED");
  }
  return new DomainError("That coupon changed state before this could apply.", 409, "CONFLICT");
}

/**
 * Return a POINTS coupon's spent points to the member, inside the caller's
 * transaction. Keyed on the coupon's freshly-incremented `ledgerSeq` so a later
 * void→reactivate→void cycle never reuses the same idempotency key. A no-op for
 * an admin-granted (zero-point) coupon or one already refunded.
 */
async function refundCouponPoints(
  coupon: HydratedDocument<ICoupon>,
  session: ClientSession,
  adminId: string,
  actionLabel: string,
  now: Date,
): Promise<void> {
  if (coupon.pointsSpent <= 0 || coupon.refundedAt) return;
  const pts = coupon.pointsSpent;

  const wallet = await Wallet.findOneAndUpdate(
    { user: coupon.user },
    { $inc: { totalBalance: pts, activityBalance: pts } },
    { new: true, upsert: true, session },
  );

  await WalletTransaction.create(
    [
      {
        user: coupon.user,
        source: PointSource.ADJUSTMENT,
        type: TransactionType.CREDIT,
        points: pts,
        balanceAfter: wallet.totalBalance,
        referenceType: "CouponRefund",
        referenceId: coupon._id,
        description: `Coupon ${coupon.code} ${actionLabel} by admin — ${pts.toLocaleString("en-IN")} points refunded`,
        status: TransactionStatus.COMPLETED,
        idempotencyKey: `coupon-refund:${coupon.code}:${coupon.ledgerSeq}`,
        createdBy: adminId,
        meta: { couponCode: coupon.code, refundedPoints: pts, action: actionLabel },
      },
    ],
    { session },
  );

  coupon.refundedAt = now;
  await coupon.save({ session });
}

/**
 * Take a still-usable coupon out of circulation and refund its points.
 *
 * Shared by "deactivate" (→ VOID, reversible) and "force-expire" (→ EXPIRED).
 * The conditional `findOneAndUpdate` demands the coupon is ACTIVE and still in
 * date, so it applies exactly once even under concurrent clicks, and a redeemed,
 * already-void or lapsed coupon is refused with a precise reason. The status
 * flip, the refund debit-reversal and the `refundedAt` stamp share ONE
 * transaction — a crash can never leave a coupon dead with its points still
 * spent, or refunded with its status unchanged.
 *
 * This refund is deliberate policy and the reason it differs from the automatic
 * `expireCoupons` sweep, which forfeits: a coupon an admin kills early is not a
 * coupon a family let lapse, so the points come back.
 */
async function killCoupon(
  couponId: string,
  adminId: string,
  nextStatus: typeof CouponStatus.VOID | typeof CouponStatus.EXPIRED,
  actionLabel: string,
): Promise<CouponDTO> {
  await dbConnect();
  const now = new Date();

  const coupon = await withTransaction(async (session) => {
    const flipped = await Coupon.findOneAndUpdate(
      { _id: couponId, status: CouponStatus.ACTIVE, expiresAt: { $gt: now } },
      { $set: { status: nextStatus }, $inc: { ledgerSeq: 1 } },
      { new: true, session },
    );
    if (!flipped) throw await couponStateError(couponId, now);

    await refundCouponPoints(flipped, session, adminId, actionLabel, now);
    return flipped;
  });

  return toDTO(coupon, now);
}

/** Deactivate a coupon: a store will refuse it, and its points are refunded. */
export function voidCoupon(couponId: string, adminId: string): Promise<CouponDTO> {
  return killCoupon(couponId, adminId, CouponStatus.VOID, "cancelled");
}

/** Force a still-valid coupon to expire now, refunding its points. */
export function adminExpireCoupon(couponId: string, adminId: string): Promise<CouponDTO> {
  return killCoupon(couponId, adminId, CouponStatus.EXPIRED, "expired");
}

/**
 * Bring a deactivated coupon back. If its points were refunded when it was
 * voided, they are re-debited here so an ACTIVE points coupon always has its
 * points paid — reactivation is refused when the member has since spent them.
 * A coupon past its expiry can never be reactivated.
 */
export async function reactivateCoupon(couponId: string, adminId: string): Promise<CouponDTO> {
  await dbConnect();
  const now = new Date();

  const coupon = await withTransaction(async (session) => {
    const current = await Coupon.findById(couponId).session(session);
    if (!current) throw new DomainError("That coupon no longer exists.", 404, "NOT_FOUND");
    if (current.status !== CouponStatus.VOID) {
      throw new DomainError("Only a deactivated coupon can be reactivated.", 409, "NOT_VOID");
    }
    if (current.expiresAt.getTime() <= now.getTime()) {
      throw new DomainError(
        "That coupon's validity window has already passed — it cannot be reactivated.",
        409,
        "ALREADY_EXPIRED",
      );
    }

    // Gate the flip on status so two concurrent reactivations cannot both
    // re-debit. A loser matches nothing and is reported as a conflict.
    const flipped = await Coupon.findOneAndUpdate(
      { _id: couponId, status: CouponStatus.VOID },
      { $set: { status: CouponStatus.ACTIVE }, $inc: { ledgerSeq: 1 } },
      { new: true, session },
    );
    if (!flipped) throw new DomainError("That coupon changed state first.", 409, "CONFLICT");

    // Re-charge only a coupon whose points were actually returned.
    if (flipped.pointsSpent > 0 && flipped.refundedAt) {
      const pts = flipped.pointsSpent;
      const wallet = await Wallet.findOne({ user: flipped.user }).session(session);
      if (!wallet || wallet.totalBalance < pts) {
        throw new DomainError(
          "The member has spent the refunded points, so this coupon can't be reactivated. Issue a new one instead.",
          409,
          "INSUFFICIENT",
        );
      }
      const plan = planBucketDebit(wallet, pts);
      const debited = await Wallet.findOneAndUpdate(
        { _id: wallet._id, totalBalance: { $gte: pts } },
        {
          $inc: {
            totalBalance: -pts,
            quizBalance: -plan.quiz,
            referralBalance: -plan.referral,
            activityBalance: -plan.activity,
          },
        },
        { new: true, session },
      );
      if (!debited) {
        throw new DomainError(
          "The member has spent the refunded points, so this coupon can't be reactivated. Issue a new one instead.",
          409,
          "INSUFFICIENT",
        );
      }

      await WalletTransaction.create(
        [
          {
            user: flipped.user,
            source: PointSource.FUTURE_REDEMPTION,
            type: TransactionType.DEBIT,
            points: -pts,
            balanceAfter: debited.totalBalance,
            referenceType: "CouponReactivation",
            referenceId: flipped._id,
            description: `Coupon ${flipped.code} reactivated by admin — ${pts.toLocaleString("en-IN")} points debited again`,
            status: TransactionStatus.COMPLETED,
            idempotencyKey: `coupon-recharge:${flipped.code}:${flipped.ledgerSeq}`,
            createdBy: adminId,
            meta: { couponCode: flipped.code, pointsSpent: pts, action: "reactivate" },
          },
        ],
        { session },
      );

      flipped.refundedAt = null;
      await flipped.save({ session });
    }

    return flipped;
  });

  return toDTO(coupon, now);
}

/**
 * Issue a coupon directly to a member from the admin console.
 *
 * PROMO mints a free coupon (source ADMIN, zero points) — a gift or a
 * compensation that creates spendable value the member never paid for. POINTS
 * spends the member's own points at the live rate, in one transaction, exactly
 * like self-service issuing: the balance check, the debit and the insert cannot
 * come apart.
 */
export async function adminIssueCoupon(input: AdminIssueCouponInput): Promise<CouponDTO> {
  await dbConnect();
  const policy = await getCouponPolicy();

  const member = await User.findById(input.userId).select("_id").lean();
  if (!member) throw new DomainError("That member no longer exists.", 404, "NO_USER");

  const valueRupees = Math.floor(input.valueRupees);
  if (!Number.isInteger(valueRupees) || valueRupees < 1) {
    throw new DomainError("Enter a whole rupee value of at least ₹1.", 400, "INVALID_AMOUNT");
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + policy.validityDays * DAY_MS);

  if (input.mode === "PROMO") {
    const coupon = await withTransaction(async (session) => {
      const code = await generateUniqueCouponCode(session);
      const [created] = await Coupon.create(
        [
          {
            code,
            user: member._id,
            valueRupees,
            pointsSpent: 0,
            status: CouponStatus.ACTIVE,
            source: CouponSource.ADMIN,
            issuedAt,
            expiresAt,
          },
        ],
        { session },
      );
      return created;
    });
    return toDTO(coupon, issuedAt);
  }

  // POINTS mode: value is realised out of the member's balance at the live rate,
  // so the coupon is worth exactly what was spent (no flooring loss).
  if (policy.pointsPerRupee <= 0) {
    throw new DomainError(
      "The points-per-rupee rate isn't configured. Fix it in settings first.",
      503,
      "BAD_RATE",
    );
  }
  const points = valueRupees * policy.pointsPerRupee;

  const coupon = await withTransaction(async (session) => {
    const wallet = await Wallet.findOne({ user: member._id }).session(session);
    if (!wallet || wallet.totalBalance < points) {
      throw new DomainError(
        `This member holds ${wallet?.totalBalance ?? 0} points — ${points.toLocaleString("en-IN")} are needed for a ₹${valueRupees.toLocaleString("en-IN")} coupon.`,
        400,
        "INSUFFICIENT",
      );
    }

    const plan = planBucketDebit(wallet, points);
    const debited = await Wallet.findOneAndUpdate(
      { _id: wallet._id, totalBalance: { $gte: points } },
      {
        $inc: {
          totalBalance: -points,
          quizBalance: -plan.quiz,
          referralBalance: -plan.referral,
          activityBalance: -plan.activity,
        },
      },
      { new: true, session },
    );
    if (!debited) {
      throw new DomainError("This member no longer has enough points.", 400, "INSUFFICIENT");
    }

    const code = await generateUniqueCouponCode(session);
    const [created] = await Coupon.create(
      [
        {
          code,
          user: member._id,
          valueRupees,
          pointsSpent: points,
          status: CouponStatus.ACTIVE,
          source: CouponSource.POINTS,
          issuedAt,
          expiresAt,
        },
      ],
      { session },
    );

    await WalletTransaction.create(
      [
        {
          user: member._id,
          source: PointSource.FUTURE_REDEMPTION,
          type: TransactionType.DEBIT,
          points: -points,
          balanceAfter: debited.totalBalance,
          referenceType: "Coupon",
          referenceId: created._id,
          description: `Coupon ${code} issued by admin — worth ₹${valueRupees.toLocaleString("en-IN")}`,
          status: TransactionStatus.COMPLETED,
          idempotencyKey: `coupon:${code}`,
          createdBy: input.adminId,
          meta: { couponCode: code, valueRupees, issuedByAdmin: true },
        },
      ],
      { session },
    );

    return created;
  });

  return toDTO(coupon, issuedAt);
}
