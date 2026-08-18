import { handle, ok } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { issueCouponSchema } from "@/lib/validation/coupon";
import { issueCoupon, listCoupons } from "@/server/services/coupon.service";

export const runtime = "nodejs";

/**
 * The member's own coupons, newest first.
 *
 * Scoped to `requireUser().id` rather than any id in the request — a coupon code
 * is bearer value, so one member must never be able to list another's.
 */
export const GET = handle(async () => {
  const user = await requireUser();
  const coupons = await listCoupons(user.id);
  return ok({ coupons });
});

/**
 * Turn points into a coupon.
 *
 * The schema checks the SHAPE of `points` only. The minimum, the step, the live
 * conversion rate and the member's balance are all re-read inside
 * `issueCoupon`, which performs the balance check, the debit and the coupon
 * insert in a single transaction. That is what makes ten simultaneous taps
 * produce one coupon instead of ten: this route needs no lock of its own, and
 * must not try to pre-check the balance here — a check outside the transaction
 * would only re-open the window the transaction exists to close.
 */
export const POST = handle(async (req) => {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const { points } = issueCouponSchema.parse(body);
  const coupon = await issueCoupon(user.id, points);
  return ok({ coupon }, { status: 201 });
});
