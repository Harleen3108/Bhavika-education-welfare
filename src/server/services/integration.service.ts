import "server-only";
import { randomUUID } from "crypto";
import { dbConnect } from "@/server/db/connect";
import { IntegrationTransaction, Wallet } from "@/server/models";
import { IntegrationStatus, PointSource, TransactionType } from "@/lib/enums";
import { env } from "@/lib/env";
import { DomainError } from "@/server/errors";
import { getSettings } from "./content.service";
import { creditPoints } from "./wallet.service";
import { createSignedToken } from "@/server/integrations/signing";

export type RedemptionState = {
  enabled: boolean;
  balance: number;
  /** Points needed before redeeming is possible at all. */
  minRedeem: number;
  /** Points that buy one rupee of coupon value. */
  pointsPerRupee: number;
  /** Redemptions must be a whole multiple of this. */
  stepPoints: number;
  /** Coupon value the member's current balance is worth, in whole rupees. */
  balanceValue: number;
  /** Points still needed to reach the threshold; 0 once eligible. */
  pointsToGo: number;
  /** The largest redeemable amount available right now, in points. */
  maxRedeemable: number;
  externalConfigured: boolean;
};

/** Coupon value in whole rupees for a given number of points. */
export function pointsToRupees(points: number, pointsPerRupee: number): number {
  if (pointsPerRupee <= 0) return 0;
  return Math.floor(points / pointsPerRupee);
}

export async function getRedemptionState(userId: string): Promise<RedemptionState> {
  await dbConnect();
  const [settings, wallet] = await Promise.all([
    getSettings(),
    Wallet.findOne({ user: userId }).lean(),
  ]);

  const { redemptionEnabled, minRedeemPoints, pointsPerRupee, redeemStepPoints } =
    settings.integration;
  const balance = wallet?.totalBalance ?? 0;

  // Round DOWN to the step so the figure offered is always actually redeemable;
  // offering a number the server would then reject reads as a broken promise.
  // The step is guarded like the rate above: `Math.floor(n / 0) * 0` is NaN, not
  // Infinity, and a NaN here would travel into the member's page as the amount
  // they may redeem. The admin form can no longer save a zero, but a settings
  // document written by hand can still hold one.
  const maxRedeemable =
    redeemStepPoints > 0 && balance >= minRedeemPoints
      ? Math.floor(balance / redeemStepPoints) * redeemStepPoints
      : 0;

  return {
    enabled: redemptionEnabled,
    balance,
    minRedeem: minRedeemPoints,
    pointsPerRupee,
    stepPoints: redeemStepPoints,
    balanceValue: pointsToRupees(balance, pointsPerRupee),
    pointsToGo: Math.max(0, minRedeemPoints - balance),
    maxRedeemable,
    externalConfigured: Boolean(env.JMD_INTEGRATION_URL && env.JMD_INTEGRATION_SECRET),
  };
}

/**
 * Begin a redemption to the external Jai Maa Durga platform.
 *
 * Phase 1: gated OFF by SystemSettings.integration.redemptionEnabled. When
 * enabled (Phase 2), this creates an INITIATED IntegrationTransaction and
 * returns a short-lived SIGNED token carrying only the reference id. Points are
 * NOT debited here — they move only when the external platform confirms via the
 * server-to-server webhook (exactly-once, idempotency-keyed on the reference).
 */
export async function initiateRedemption(
  userId: string,
  points: number,
): Promise<{ token: string; redirectUrl: string; referenceId: string }> {
  await dbConnect();
  const settings = await getSettings();

  if (!settings.integration.redemptionEnabled) {
    throw new DomainError("Benefit redemption isn't available yet. Coming soon!", 403, "REDEMPTION_DISABLED");
  }
  if (!env.JMD_INTEGRATION_URL || !env.JMD_INTEGRATION_SECRET) {
    throw new DomainError("Redemption is not fully configured yet.", 503, "NOT_CONFIGURED");
  }

  // Every rule is re-checked here against live settings. The client is shown the
  // same numbers, but it is never the authority on them.
  const { minRedeemPoints, redeemStepPoints } = settings.integration;

  if (!Number.isInteger(points) || points <= 0) {
    throw new DomainError("Enter a whole number of points.", 400, "INVALID_AMOUNT");
  }
  if (points < minRedeemPoints) {
    throw new DomainError(
      `You need at least ${minRedeemPoints.toLocaleString("en-IN")} points to redeem.`,
      400,
      "MIN_REDEEM",
    );
  }
  if (points % redeemStepPoints !== 0) {
    throw new DomainError(
      `Redeem in multiples of ${redeemStepPoints.toLocaleString("en-IN")} points.`,
      400,
      "STEP_REDEEM",
    );
  }

  const wallet = await Wallet.findOne({ user: userId }).lean();
  if (!wallet || wallet.totalBalance < points) {
    throw new DomainError("You don't have enough points for this redemption.", 400, "INSUFFICIENT");
  }

  const referenceId = randomUUID();
  await IntegrationTransaction.create({
    user: userId,
    referenceId,
    pointsRequested: points,
    status: IntegrationStatus.INITIATED,
  });

  // Signed, short-lived, carries only the reference id (no balances in the URL).
  const token = createSignedToken({ ref: referenceId, sub: userId }, 300);
  const redirectUrl = `${env.JMD_INTEGRATION_URL}?token=${encodeURIComponent(token)}`;

  return { token, redirectUrl, referenceId };
}

/**
 * Confirm a redemption from the external platform's server-to-server webhook.
 * Idempotent: the wallet debit is keyed on the reference id, so replays never
 * double-debit. (Signature verification happens at the route layer.)
 */
export async function confirmRedemption(
  referenceId: string,
  externalRef?: string,
): Promise<{ ok: boolean }> {
  await dbConnect();
  const txn = await IntegrationTransaction.findOne({ referenceId });
  if (!txn) throw new DomainError("Unknown redemption reference.", 404, "NOT_FOUND");

  if (txn.status === IntegrationStatus.COMPLETED) return { ok: true }; // idempotent

  // Debit the points exactly once.
  await creditPoints({
    userId: txn.user,
    source: PointSource.FUTURE_REDEMPTION,
    type: TransactionType.DEBIT,
    points: txn.pointsRequested,
    referenceType: "IntegrationTransaction",
    referenceId: txn._id,
    description: "Points redeemed via Jai Maa Durga",
    idempotencyKey: `redeem:${referenceId}`,
  });

  txn.status = IntegrationStatus.COMPLETED;
  if (externalRef) txn.externalRef = externalRef;
  await txn.save();

  return { ok: true };
}
