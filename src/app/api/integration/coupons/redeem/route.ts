import { handle, ok, fail, getClientIp, hashIp, DomainError } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { redeemCouponSchema } from "@/lib/validation/coupon";
import { redeemCoupon, getCouponByCode, type CouponDTO } from "@/server/services/coupon.service";
import {
  requireSignedStoreRequest,
  chargeUnknownCode,
  STORE_API_RATE,
} from "@/server/services/integration.service";
import { CouponStatus } from "@/lib/enums";

export const runtime = "nodejs";

/**
 * `POST /api/integration/coupons/redeem` — spend a coupon exactly once, against
 * one of the store's own order references. Documented in
 * `docs/JAI_MAA_DURGA_INTEGRATION.md`.
 *
 * Deliberately NOT gated on `settings.integration.redemptionEnabled`. That
 * switch stops NEW coupons being issued. A coupon already in a family's hands
 * was paid for with points that are already gone, so turning issuing off must
 * never strand it — that would be a silent confiscation.
 */

const NO_STORE = { "cache-control": "no-store" } as const;
const CURRENCY = "INR";

type RedeemResponse = {
  redeemed: true;
  /**
   * True when this request found the coupon already spent against the SAME
   * order reference — i.e. it is a retry of a call that already succeeded. The
   * store can log it; it changes nothing about the outcome.
   */
  replay: boolean;
  code: string;
  valueRupees: number;
  currency: string;
  externalRef: string;
  redeemedAt: string | null;
};

function toResponse(coupon: CouponDTO, replay: boolean): RedeemResponse {
  return {
    redeemed: true,
    replay,
    code: coupon.code,
    valueRupees: coupon.valueRupees,
    currency: CURRENCY,
    externalRef: coupon.externalRef ?? "",
    redeemedAt: coupon.redeemedAt,
  };
}

export const POST = handle(async (req) => {
  const bucketKey = `jmd-coupon-redeem:${hashIp(getClientIp(req))}`;
  const rate = STORE_API_RATE.redeem;
  const rl = await rateLimit(bucketKey, rate.limit, rate.windowSeconds);
  if (!rl.success) {
    const res = fail("Too many requests. Please slow down.", 429, { code: "RATE_LIMITED" });
    res.headers.set("retry-after", String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))));
    res.headers.set("cache-control", "no-store");
    return res;
  }

  const { body } = await requireSignedStoreRequest(req);
  const { code, externalRef } = redeemCouponSchema.parse(body);

  try {
    // `redeemCoupon` is a single conditional findOneAndUpdate demanding ACTIVE
    // and an unexpired date, so concurrent callers cannot both match: exactly
    // one state change happens no matter how many requests arrive together.
    const coupon = await redeemCoupon(code, externalRef);
    return ok(toResponse(coupon, false), { headers: NO_STORE });
  } catch (err) {
    if (!(err instanceof DomainError)) throw err;

    if (err.code === "ALREADY_REDEEMED") {
      // IDEMPOTENCY. A dropped response, a till retry or a duplicated queue
      // message arrives here. If the coupon is already spent against THIS same
      // order, the work asked for has been done — answer 200 with the original
      // outcome rather than a 409 that would send a paying family away from a
      // counter for a network hiccup. A DIFFERENT order reference is a genuine
      // conflict (a second purchase reaching for a spent coupon) and still 409s.
      const existing = await getCouponByCode(code);
      if (
        existing &&
        existing.status === CouponStatus.REDEEMED &&
        existing.externalRef === externalRef
      ) {
        return ok(toResponse(existing, true), { headers: NO_STORE });
      }
    }

    if (err.code === "NOT_FOUND") {
      // Same anti-enumeration charge as the validate endpoint, on the same
      // reasoning — and this bucket is a third the size to begin with.
      await chargeUnknownCode(bucketKey, rate);
    }

    // NOT_FOUND (404), ALREADY_REDEEMED (409) and EXPIRED (410) are reported
    // precisely here, unlike on validate. This endpoint is mutating, needs a
    // unique order reference we store and can audit, is throttled to a third of
    // validate's rate, and is reached only when a real purchase is at the
    // counter — where a shopkeeper genuinely has to tell a family "this was
    // used on 3 March" rather than "no". Mining through it costs a fabricated
    // order reference per attempt and leaves our record of every one.
    throw err;
  }
});
