"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminIssueCouponSchema, couponActionSchema } from "@/lib/validation/admin";
import {
  adminIssueCoupon,
  voidCoupon,
  reactivateCoupon,
  adminExpireCoupon,
  type CouponDTO,
} from "@/server/services/coupon.service";
import { logAdminAction } from "@/server/services/audit.service";
import { runAdmin, type ActionResult } from "./util";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid coupon id.");

/**
 * Every coupon mutation revalidates the same set: the admin ledger, and the two
 * member surfaces a refund or a new coupon shows up on. A void or force-expire
 * refunds points, so the member's wallet history changes too.
 */
function revalidateCouponSurfaces(): void {
  revalidatePath("/admin/coupons");
  revalidatePath("/dashboard/benefits");
  revalidatePath("/dashboard/wallet");
}

/** Issue a coupon to a member — a free promo, or spent from their own points. */
export async function adminIssueCouponAction(input: unknown): Promise<ActionResult<{ code: string; valueRupees: number }>> {
  return runAdmin(async (admin) => {
    const { userId, mode, valueRupees, reason } = adminIssueCouponSchema.parse(input);
    const coupon = await adminIssueCoupon({ userId, valueRupees, mode, adminId: admin.id });

    await logAdminAction(admin.id, "coupon.issue", {
      targetType: "User",
      targetId: userId,
      reason: `${mode === "PROMO" ? "Promo" : "From points"} ₹${valueRupees} — ${reason}`,
      meta: {
        couponId: coupon.id,
        code: coupon.code,
        mode,
        valueRupees: coupon.valueRupees,
        pointsSpent: coupon.pointsSpent,
      },
    });

    revalidateCouponSurfaces();
    revalidatePath(`/admin/users/${userId}`);
    return { code: coupon.code, valueRupees: coupon.valueRupees };
  });
}

type CouponActionResult = { code: string; status: string; refundedAt: string | null };

/** Void, reactivate, or force-expire a single coupon. */
export async function couponAction(
  input: unknown,
): Promise<ActionResult<CouponActionResult>> {
  return runAdmin(async (admin) => {
    const couponId = objectId.parse((input as { couponId?: unknown })?.couponId);
    // couponActionSchema strips the couponId key it does not declare.
    const { action, reason } = couponActionSchema.parse(input);

    let coupon: CouponDTO;
    if (action === "void") coupon = await voidCoupon(couponId, admin.id);
    else if (action === "reactivate") coupon = await reactivateCoupon(couponId, admin.id);
    else coupon = await adminExpireCoupon(couponId, admin.id);

    await logAdminAction(admin.id, `coupon.${action}`, {
      targetType: "Coupon",
      targetId: couponId,
      reason: reason || undefined,
      meta: {
        code: coupon.code,
        status: coupon.status,
        refunded: Boolean(coupon.refundedAt),
        pointsSpent: coupon.pointsSpent,
      },
    });

    revalidateCouponSurfaces();
    return { code: coupon.code, status: coupon.status, refundedAt: coupon.refundedAt };
  });
}
