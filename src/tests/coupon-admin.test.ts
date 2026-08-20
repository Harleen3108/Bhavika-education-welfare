import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import type { HydratedDocument } from "mongoose";
import {
  issueCoupon,
  adminIssueCoupon,
  voidCoupon,
  reactivateCoupon,
  adminExpireCoupon,
  getCouponByCode,
  validateCoupon,
} from "@/server/services/coupon.service";
import { creditPoints, getWallet } from "@/server/services/wallet.service";
import { Coupon, SystemSettings, User, WalletTransaction, type IUser } from "@/server/models";
import { CouponStatus, CouponSource, PointSource } from "@/lib/enums";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { DomainError } from "@/server/errors";
import { makeUser } from "./helpers";

const ADMIN_ID = "000000000000000000000001";

async function enableCoupons(overrides: Record<string, unknown> = {}) {
  await SystemSettings.findOneAndUpdate(
    { singleton: "global" },
    {
      $set: {
        integration: { ...DEFAULT_SETTINGS.integration, redemptionEnabled: true, ...overrides },
      },
    },
    { upsert: true, new: true },
  );
}

async function memberWith(points: number): Promise<HydratedDocument<IUser>> {
  const user = await makeUser();
  if (points > 0) {
    await creditPoints({
      userId: user._id,
      source: PointSource.QUIZ,
      points,
      referenceType: "Test",
      description: "seed",
      idempotencyKey: `seed:${user._id.toString()}`,
    });
  }
  return user;
}

async function codeOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    return err instanceof DomainError ? err.code : `UNEXPECTED:${String(err)}`;
  }
}

beforeAll(async () => {
  await Coupon.syncIndexes();
});

beforeEach(async () => {
  await enableCoupons();
});

/* Feature 1 — Admin setting user redemption (per-member override). */
describe("per-member redemption block", () => {
  it("stops a blocked member from generating coupons while others still can", async () => {
    const blocked = await memberWith(5000);
    await User.updateOne({ _id: blocked._id }, { $set: { redemptionBlocked: true } });

    expect(await codeOf(() => issueCoupon(blocked._id.toString(), 5000))).toBe("REDEMPTION_BLOCKED");
    // Nothing moved.
    expect((await getWallet(blocked._id.toString())).total).toBe(5000);
    expect(await Coupon.countDocuments({ user: blocked._id })).toBe(0);

    // A different member is unaffected.
    const ok = await memberWith(5000);
    const coupon = await issueCoupon(ok._id.toString(), 5000);
    expect(coupon.status).toBe(CouponStatus.ACTIVE);
  });

  it("lets the member generate again once unblocked", async () => {
    const user = await memberWith(5000);
    await User.updateOne({ _id: user._id }, { $set: { redemptionBlocked: true } });
    expect(await codeOf(() => issueCoupon(user._id.toString(), 5000))).toBe("REDEMPTION_BLOCKED");

    await User.updateOne({ _id: user._id }, { $set: { redemptionBlocked: false } });
    const coupon = await issueCoupon(user._id.toString(), 5000);
    expect(coupon.status).toBe(CouponStatus.ACTIVE);
  });
});

/* Feature 4 — Admin can add a coupon and amount on a user account. */
describe("adminIssueCoupon", () => {
  it("mints a free promo coupon without touching the member's points", async () => {
    const user = await memberWith(0);
    const coupon = await adminIssueCoupon({
      userId: user._id.toString(),
      valueRupees: 300,
      mode: "PROMO",
      adminId: ADMIN_ID,
    });

    expect(coupon.status).toBe(CouponStatus.ACTIVE);
    expect(coupon.source).toBe(CouponSource.ADMIN);
    expect(coupon.valueRupees).toBe(300);
    expect(coupon.pointsSpent).toBe(0);
    // No points existed and none were needed.
    expect((await getWallet(user._id.toString())).total).toBe(0);
  });

  it("spends the member's own points in POINTS mode at the live rate", async () => {
    const user = await memberWith(5000);
    const coupon = await adminIssueCoupon({
      userId: user._id.toString(),
      valueRupees: 300, // 300 * 10 points/₹ = 3,000 points
      mode: "POINTS",
      adminId: ADMIN_ID,
    });

    expect(coupon.source).toBe(CouponSource.POINTS);
    expect(coupon.valueRupees).toBe(300);
    expect(coupon.pointsSpent).toBe(3000);
    expect((await getWallet(user._id.toString())).total).toBe(2000);
  });

  it("refuses POINTS mode when the member cannot cover it", async () => {
    const user = await memberWith(1000);
    expect(
      await codeOf(() =>
        adminIssueCoupon({ userId: user._id.toString(), valueRupees: 300, mode: "POINTS", adminId: ADMIN_ID }),
      ),
    ).toBe("INSUFFICIENT");
    expect((await getWallet(user._id.toString())).total).toBe(1000);
    expect(await Coupon.countDocuments({ user: user._id })).toBe(0);
  });
});

/* Feature 2 — Coupon active/inactive edit by admin (void + reactivate). */
describe("voidCoupon / reactivateCoupon", () => {
  it("deactivates a coupon, refunds the points, and a store then refuses it", async () => {
    const user = await memberWith(5000);
    const userId = user._id.toString();
    const issued = await issueCoupon(userId, 5000);
    expect((await getWallet(userId)).total).toBe(0);

    const voided = await voidCoupon(issued.id, ADMIN_ID);
    expect(voided.status).toBe(CouponStatus.VOID);
    expect(voided.refundedAt).not.toBeNull();

    // Points came back.
    expect((await getWallet(userId)).total).toBe(5000);
    const refund = await WalletTransaction.findOne({
      idempotencyKey: `coupon-refund:${issued.code}:1`,
    });
    expect(refund?.points).toBe(5000);

    // The store must refuse it.
    const check = await validateCoupon(issued.code);
    expect(check.valid).toBe(false);
    expect(check.reason).toBe("VOID");
  });

  it("re-debits the refunded points when reactivated", async () => {
    const user = await memberWith(5000);
    const userId = user._id.toString();
    const issued = await issueCoupon(userId, 5000);

    await voidCoupon(issued.id, ADMIN_ID);
    expect((await getWallet(userId)).total).toBe(5000);

    const back = await reactivateCoupon(issued.id, ADMIN_ID);
    expect(back.status).toBe(CouponStatus.ACTIVE);
    expect(back.refundedAt).toBeNull();
    // The points were taken again, so the coupon is paid for once more.
    expect((await getWallet(userId)).total).toBe(0);

    const check = await validateCoupon(issued.code);
    expect(check.valid).toBe(true);
  });

  it("refuses to reactivate when the member has spent the refunded points", async () => {
    const user = await memberWith(5000);
    const userId = user._id.toString();
    const issued = await issueCoupon(userId, 5000);

    await voidCoupon(issued.id, ADMIN_ID); // refunds 5,000 → balance 5,000
    expect((await getWallet(userId)).total).toBe(5000);

    // The member spends the refunded points on a fresh coupon → balance 0.
    await issueCoupon(userId, 5000);
    expect((await getWallet(userId)).total).toBe(0);

    // Reactivation would need to re-debit 5,000 that are no longer there.
    expect(await codeOf(() => reactivateCoupon(issued.id, ADMIN_ID))).toBe("INSUFFICIENT");

    // The coupon stays void and no phantom debit was written.
    const stored = await getCouponByCode(issued.code);
    expect(stored?.status).toBe(CouponStatus.VOID);
  });

  it("does not double-refund on repeated void attempts", async () => {
    const user = await memberWith(5000);
    const userId = user._id.toString();
    const issued = await issueCoupon(userId, 5000);

    await voidCoupon(issued.id, ADMIN_ID);
    // Second void must be rejected — it is already void.
    expect(await codeOf(() => voidCoupon(issued.id, ADMIN_ID))).toBe("ALREADY_VOID");

    expect((await getWallet(userId)).total).toBe(5000);
    expect(
      await WalletTransaction.countDocuments({ referenceType: "CouponRefund", user: user._id }),
    ).toBe(1);
  });
});

/* Feature 3 — Admin can expire a coupon itself (with refund). */
describe("adminExpireCoupon", () => {
  it("force-expires a live coupon and refunds the points, unlike a lapse", async () => {
    const user = await memberWith(5000);
    const userId = user._id.toString();
    const issued = await issueCoupon(userId, 5000);

    const expired = await adminExpireCoupon(issued.id, ADMIN_ID);
    expect(expired.status).toBe(CouponStatus.EXPIRED);
    expect(expired.refundedAt).not.toBeNull();

    // The differentiator from the time-lapse sweep: the points come back.
    expect((await getWallet(userId)).total).toBe(5000);
    const stored = await getCouponByCode(issued.code);
    expect(stored?.status).toBe(CouponStatus.EXPIRED);
  });

  it("cannot expire an already-redeemed coupon", async () => {
    const user = await memberWith(5000);
    const issued = await issueCoupon(user._id.toString(), 5000);
    await redeemCouponSafe(issued.code);

    expect(await codeOf(() => adminExpireCoupon(issued.id, ADMIN_ID))).toBe("REDEEMED");
  });
});

/** Local helper: the redeem service needs an order ref. */
async function redeemCouponSafe(code: string) {
  const { redeemCoupon } = await import("@/server/services/coupon.service");
  await redeemCoupon(code, "JMD-TEST-ORDER");
}
