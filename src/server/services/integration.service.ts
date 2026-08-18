import "server-only";
import { dbConnect } from "@/server/db/connect";
import { IntegrationTransaction, Wallet } from "@/server/models";
import { IntegrationStatus, PointSource, TransactionType } from "@/lib/enums";
import { env } from "@/lib/env";
import { DomainError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { getSettings } from "./content.service";
import { creditPoints } from "./wallet.service";
import { verifyWebhookSignature } from "@/server/integrations/signing";

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

/* ========================================================================== */
/*                          RETIRED: initiateRedemption                       */
/* ========================================================================== */

/*
  `initiateRedemption` USED TO LIVE HERE AND HAS BEEN DELETED ON PURPOSE.

  It read the member's balance, wrote an INITIATED IntegrationTransaction and
  redirected the member to the partner store with a signed token. The points
  were debited only later, when the store called the confirmation webhook.

  Between those two moments the points were still in the wallet. Ten tabs meant
  ten passes of the same balance check, ten reference ids, ten confirmations
  under ten distinct idempotency keys, and a wallet at -45,000 points on a
  5,000-point balance. No amount of care at the callback could close that: the
  check and the debit were in different requests, minutes apart.

  Redemption now issues a coupon instead (`coupon.service.ts`), where the
  balance check, the debit and the coupon insert share ONE Mongo transaction, so
  the window does not exist. Deleting this function rather than disabling it is
  deliberate — a disabled code path is a code path someone re-enables.

  `confirmRedemption` below is KEPT. Nothing can create an INITIATED row any
  more, so it can only ever act on history that already exists, and the
  IntegrationTransaction collection is the audit trail for that history.
*/

/**
 * Confirm a redemption from the external platform's server-to-server webhook.
 *
 * LEGACY / INERT. With `initiateRedemption` gone nothing creates INITIATED
 * transactions, so in practice this now has nothing to confirm. It stays wired
 * to `/api/integration/webhook` so that any INITIATED row written before the
 * cutover can still be settled honestly instead of being stranded, and so the
 * audit history remains readable. New integrations must use the coupon
 * endpoints under `/api/integration/coupons/*`.
 *
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

/* ========================================================================== */
/*                     Partner store API — request security                   */
/* ========================================================================== */

/**
 * Headers the Jai Maa Durga store sends on every coupon call.
 *
 * The signature header name matches the one the existing webhook already uses,
 * so the store implements one signing routine. The SIGNING STRING differs and
 * is documented in `docs/JAI_MAA_DURGA_INTEGRATION.md`: the coupon endpoints
 * sign `<timestamp>.<rawBody>`, not the body alone, because a signature over
 * the body alone is replayable forever.
 */
export const STORE_SIGNATURE_HEADER = "x-jmd-signature";
export const STORE_TIMESTAMP_HEADER = "x-jmd-timestamp";

/**
 * How far a request's timestamp may sit from our clock, in seconds.
 *
 * Five minutes each way. Generous enough for an unsynchronised till in a shop
 * with intermittent power, tight enough that a captured request is useless by
 * the time it is worth replaying. Future timestamps are rejected too — a clock
 * running fast is a clock, a clock running years fast is an attacker extending
 * their own window.
 */
export const STORE_TIMESTAMP_TOLERANCE_SECONDS = 300;

/**
 * A signed request body is a coupon code and an order reference. Anything
 * larger is not a coupon call, and hashing it would be work an unauthenticated
 * caller chose for us.
 */
const MAX_STORE_BODY_BYTES = 2048;

/**
 * Per-caller budgets for the store endpoints.
 *
 * Deliberately NOT in `lib/constants.ts` RATE_LIMITS: those are the public,
 * human-facing buckets (a person filling a form). These are one machine talking
 * to another, they are part of the published integration contract, and the
 * penalty below only makes sense next to the code that applies it.
 *
 * `unknownCodeCost` is the anti-enumeration control. A lookup that finds NO
 * coupon spends this many units instead of one, so a caller grinding through
 * guesses exhausts the bucket four times faster than a till checking real
 * coupons. Once the bucket is empty EVERY request from that caller is refused —
 * including one carrying a real code — so there is no "429 means wrong, 200
 * means right" oracle to read once the throttle bites.
 */
export const STORE_API_RATE = {
  validate: { limit: 60, windowSeconds: 60 },
  redeem: { limit: 20, windowSeconds: 60 },
  unknownCodeCost: 4,
} as const;

export type StoreRateBucket = { limit: number; windowSeconds: number };

/**
 * Charge the extra cost of a code that matched no coupon.
 *
 * The request already spent one unit on the way in, so only the remainder is
 * charged here. The result is ignored on purpose: the caller has already been
 * answered for THIS request, and refusing it retroactively would tell them
 * their guess was wrong. The bite lands on their next request, which is refused
 * whatever it contains.
 */
export async function chargeUnknownCode(bucketKey: string, bucket: StoreRateBucket): Promise<void> {
  for (let i = 1; i < STORE_API_RATE.unknownCodeCost; i++) {
    await rateLimit(bucketKey, bucket.limit, bucket.windowSeconds);
  }
}

export type SignedStoreRequest = {
  /** The exact bytes that were signed. */
  raw: string;
  /** `raw` parsed as JSON; still unvalidated — hand it to a Zod schema. */
  body: unknown;
};

/**
 * Authenticate a server-to-server call from the partner store.
 *
 * Throws `DomainError`, which the `handle()` wrapper turns into the same JSON
 * shape for every endpoint — so validate and redeem are indistinguishable in
 * how they refuse a bad caller, and neither reveals whether the code inside the
 * body meant anything.
 *
 * Order matters: the cheap header checks run before we read the body, and the
 * signature is verified before the JSON is parsed. An unauthenticated caller
 * never reaches a parser.
 */
export async function requireSignedStoreRequest(
  req: Request,
  nowMs = Date.now(),
): Promise<SignedStoreRequest> {
  // The signing helper falls back to AUTH_SECRET when the integration secret is
  // unset, which is fine for a dormant Phase-1 endpoint but must never be the
  // key guarding money. Without a dedicated secret, these endpoints are closed.
  if (!env.JMD_INTEGRATION_SECRET) {
    throw new DomainError(
      "The coupon integration is not configured on this environment.",
      503,
      "NOT_CONFIGURED",
    );
  }

  const signature = req.headers.get(STORE_SIGNATURE_HEADER) ?? "";
  const timestamp = req.headers.get(STORE_TIMESTAMP_HEADER) ?? "";
  if (!signature || !timestamp) {
    throw new DomainError("A signed request is required.", 401, "MISSING_SIGNATURE");
  }

  const sentAtSeconds = Number(timestamp);
  if (!Number.isInteger(sentAtSeconds)) {
    throw new DomainError(
      "The request timestamp must be whole Unix seconds.",
      401,
      "BAD_TIMESTAMP",
    );
  }
  const skew = Math.abs(Math.floor(nowMs / 1000) - sentAtSeconds);
  if (skew > STORE_TIMESTAMP_TOLERANCE_SECONDS) {
    throw new DomainError(
      "The request timestamp is outside the accepted window.",
      401,
      "STALE_REQUEST",
    );
  }

  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_STORE_BODY_BYTES) {
    throw new DomainError("That request body is too large.", 413, "PAYLOAD_TOO_LARGE");
  }

  // Signed over the timestamp STRING exactly as it arrived, not the parsed
  // number: "1755500000" and "0001755500000" are the same integer and would
  // otherwise both satisfy one signature.
  if (!verifyWebhookSignature(`${timestamp}.${raw}`, signature)) {
    throw new DomainError("The request signature did not match.", 401, "BAD_SIGNATURE");
  }

  let body: unknown;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    throw new DomainError("The request body must be valid JSON.", 400, "BAD_JSON");
  }

  return { raw, body };
}
