import { handle, ok } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { getRedemptionState, pointsToRupees } from "@/server/services/integration.service";
import { getCouponPolicy, listCoupons } from "@/server/services/coupon.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Everything the Rewards screen needs before it may offer a coupon: the live
 * conversion rules, the member's balance against them, and the coupons they
 * already hold.
 *
 * The rupee figures are computed here from the same live rate the issuing
 * transaction will use, so the confirmation the member reads can never quote a
 * threshold the server no longer enforces.
 */
export const GET = handle(async () => {
  const user = await requireUser();
  const [state, policy, coupons] = await Promise.all([
    getRedemptionState(user.id),
    getCouponPolicy(),
    listCoupons(user.id),
  ]);

  return ok({
    state,
    policy,
    coupons,
    thresholdValueRupees: pointsToRupees(state.minRedeem, state.pointsPerRupee),
    stepValueRupees: pointsToRupees(state.stepPoints, state.pointsPerRupee),
  });
});
