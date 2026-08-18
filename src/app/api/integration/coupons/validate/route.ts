import { handle, ok, fail, getClientIp, hashIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { validateCouponSchema } from "@/lib/validation/coupon";
import { validateCoupon } from "@/server/services/coupon.service";
import {
  requireSignedStoreRequest,
  chargeUnknownCode,
  STORE_API_RATE,
} from "@/server/services/integration.service";
import { CouponStatus } from "@/lib/enums";

export const runtime = "nodejs";

/**
 * `POST /api/integration/coupons/validate` — read-only coupon check for the Jai
 * Maa Durga till. Documented in `docs/JAI_MAA_DURGA_INTEGRATION.md`.
 *
 * POST, not GET, even though nothing changes: the code is money and a GET puts
 * it in the request line, where it lands in access logs, browser history and
 * proxy caches. It also gives us a body to sign.
 *
 * ENUMERATION: every answer this endpoint gives about a code that cannot be
 * used is IDENTICAL — same HTTP status, same JSON keys, same values. A code
 * that never existed, a code already spent and a code that lapsed last week all
 * return `{ valid: false, status: "INVALID", reason: "INVALID", valueRupees: 0,
 * expiresAt: null }`. The till does not need the difference to refuse a
 * coupon, and telling an attacker "that one was real, just used" is the single
 * most useful thing we could hand them: it turns a blind guess into a confirmed
 * hit. The precise reason is available where a real transaction is happening —
 * the redeem endpoint — and to the member on their own dashboard.
 */

const NO_STORE = { "cache-control": "no-store" } as const;

/** Value the store can apply, in whole rupees. INR is the only currency here. */
const CURRENCY = "INR";

type ValidateResponse = {
  valid: boolean;
  code: string;
  status: CouponStatus | "INVALID";
  reason: "INVALID" | null;
  valueRupees: number;
  currency: string;
  expiresAt: string | null;
  /** Our clock, so the till can spot its own drift before signatures start failing. */
  checkedAt: string;
};

export const POST = handle(async (req) => {
  // Keyed by a salted hash of the caller's IP: the store authenticates with a
  // shared secret rather than a per-caller identity, so its egress address is
  // the only caller identity we have. Rate limiting runs BEFORE signature
  // verification so an unauthenticated flood cannot make us hash its bodies.
  const bucketKey = `jmd-coupon-validate:${hashIp(getClientIp(req))}`;
  const rate = STORE_API_RATE.validate;
  const rl = await rateLimit(bucketKey, rate.limit, rate.windowSeconds);
  if (!rl.success) {
    const res = fail("Too many requests. Please slow down.", 429, { code: "RATE_LIMITED" });
    res.headers.set("retry-after", String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))));
    res.headers.set("cache-control", "no-store");
    // No X-RateLimit-Remaining header, here or anywhere on these endpoints: the
    // remaining count moves by 1 on a hit and by 4 on a miss, so publishing it
    // would rebuild the exact oracle the uniform response above removes.
    return res;
  }

  const { body } = await requireSignedStoreRequest(req);
  const { code } = validateCouponSchema.parse(body);

  const result = await validateCoupon(code);
  const checkedAt = new Date().toISOString();

  if (!result.valid || !result.coupon) {
    // Only a code matching NO coupon is treated as a guess. A spent or lapsed
    // coupon was really issued to a real member, so a till re-reading it is
    // ordinary behaviour and must not be throttled as an attack.
    if (result.reason === "NOT_FOUND") {
      await chargeUnknownCode(bucketKey, rate);
    }
    const invalid: ValidateResponse = {
      valid: false,
      code,
      status: "INVALID",
      reason: "INVALID",
      valueRupees: 0,
      currency: CURRENCY,
      expiresAt: null,
      checkedAt,
    };
    return ok(invalid, { headers: NO_STORE });
  }

  // Nothing about the member travels with this: no name, no email, no balance,
  // no other coupon. The store is told what it must decide with and no more.
  const valid: ValidateResponse = {
    valid: true,
    code: result.coupon.code,
    status: CouponStatus.ACTIVE,
    reason: null,
    valueRupees: result.coupon.valueRupees,
    currency: CURRENCY,
    expiresAt: result.coupon.expiresAt,
    checkedAt,
  };
  return ok(valid, { headers: NO_STORE });
});
