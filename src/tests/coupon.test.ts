import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import type { HydratedDocument } from "mongoose";
import {
  issueCoupon,
  listCoupons,
  getCouponByCode,
  validateCoupon,
  redeemCoupon,
  expireCoupons,
  getCouponPolicy,
} from "@/server/services/coupon.service";
import { creditPoints, getWallet } from "@/server/services/wallet.service";
import { Coupon, SystemSettings, WalletTransaction, type IUser } from "@/server/models";
import { CouponStatus, CouponSource, PointSource } from "@/lib/enums";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { COUPON_CODE_PATTERN, normalizeCouponCode } from "@/lib/validation/coupon";
import { DomainError } from "@/server/errors";
import { makeUser } from "./helpers";

const DAY_MS = 86_400_000;

/** Coupons are gated behind the same admin switch as the rest of the benefits programme. */
async function enableCoupons(overrides: Record<string, unknown> = {}) {
  await SystemSettings.findOneAndUpdate(
    { singleton: "global" },
    {
      $set: {
        integration: {
          ...DEFAULT_SETTINGS.integration,
          redemptionEnabled: true,
          ...overrides,
        },
      },
    },
    { upsert: true, new: true },
  );
}

/** A member holding `points`, all in the quiz bucket. */
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

/** The error a rejected issue threw, or null if it unexpectedly succeeded. */
async function codeOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    return err instanceof DomainError ? err.code : `UNEXPECTED:${String(err)}`;
  }
}

beforeAll(async () => {
  // setup.ts only syncs the models it knew about; the unique index on `code` and
  // the collection itself have to exist before a transaction writes to them.
  await Coupon.syncIndexes();
});

beforeEach(async () => {
  await enableCoupons();
});

describe("coupon code format", () => {
  it("is prefixed, grouped and drawn from the unambiguous alphabet", async () => {
    const user = await memberWith(5000);
    const coupon = await issueCoupon(user._id.toString(), 5000);

    expect(coupon.code).toMatch(COUPON_CODE_PATTERN);
    expect(coupon.code.startsWith("BHAV-")).toBe(true);
    expect(coupon.code).not.toMatch(/[OI01]/);
  });

  it("normalises whatever the member types back to the canonical code", async () => {
    const user = await memberWith(5000);
    const { code } = await issueCoupon(user._id.toString(), 5000);
    const body = code.replace(/-/g, "").slice(4);

    expect(normalizeCouponCode(code.toLowerCase())).toBe(code);
    expect(normalizeCouponCode(code.replace(/-/g, " "))).toBe(code);
    expect(normalizeCouponCode(code.replace(/-/g, ""))).toBe(code);
    // The bare body, without the prefix the member forgot to read out.
    expect(normalizeCouponCode(body)).toBe(code);
  });
});

describe("issueCoupon", () => {
  it("debits exactly once and creates exactly one coupon", async () => {
    const user = await memberWith(5000);
    const userId = user._id.toString();

    const coupon = await issueCoupon(userId, 5000);

    expect(coupon.valueRupees).toBe(500); // 5,000 points at 10 points/₹
    expect(coupon.pointsSpent).toBe(5000);
    expect(coupon.status).toBe(CouponStatus.ACTIVE);
    expect(coupon.source).toBe(CouponSource.POINTS);

    const wallet = await getWallet(userId);
    expect(wallet.total).toBe(0);
    expect(wallet.quiz).toBe(0);

    expect(await Coupon.countDocuments({ user: user._id })).toBe(1);

    const debits = await WalletTransaction.find({ user: user._id, referenceType: "Coupon" });
    expect(debits).toHaveLength(1);
    expect(debits[0].points).toBe(-5000);
    expect(debits[0].balanceAfter).toBe(0);
    expect(debits[0].idempotencyKey).toBe(`coupon:${coupon.code}`);
    // The member must be able to tell from their history WHICH coupon this was.
    expect(debits[0].description).toContain(coupon.code);
  });

  it("expires the coupon after the configured validity window", async () => {
    await enableCoupons({ couponValidityDays: 30 });
    const user = await memberWith(5000);

    const coupon = await issueCoupon(user._id.toString(), 5000);
    const lifetimeMs = Date.parse(coupon.expiresAt) - Date.parse(coupon.issuedAt);

    expect(Math.round(lifetimeMs / DAY_MS)).toBe(30);
    expect(coupon.daysRemaining).toBe(30);
  });

  it("defaults the validity window to 90 days", async () => {
    const policy = await getCouponPolicy();
    expect(policy.validityDays).toBe(90);
    expect(DEFAULT_SETTINGS.integration.couponValidityDays).toBe(90);
  });

  it("rejects an amount below the minimum, leaving the wallet untouched", async () => {
    const user = await memberWith(10_000);
    const userId = user._id.toString();

    expect(await codeOf(() => issueCoupon(userId, 4500))).toBe("MIN_REDEEM");

    expect(await Coupon.countDocuments({ user: user._id })).toBe(0);
    expect((await getWallet(userId)).total).toBe(10_000);
  });

  it("rejects an amount that is not a whole multiple of the step", async () => {
    const user = await memberWith(10_000);
    const userId = user._id.toString();

    expect(await codeOf(() => issueCoupon(userId, 5250))).toBe("STEP_REDEEM");

    expect(await Coupon.countDocuments({ user: user._id })).toBe(0);
    expect((await getWallet(userId)).total).toBe(10_000);
  });

  it("rejects more points than the member holds", async () => {
    const user = await memberWith(5000);
    const userId = user._id.toString();

    expect(await codeOf(() => issueCoupon(userId, 10_000))).toBe("INSUFFICIENT");

    expect(await Coupon.countDocuments({ user: user._id })).toBe(0);
    expect((await getWallet(userId)).total).toBe(5000);
  });

  it("refuses to issue while the benefits programme is switched off", async () => {
    await enableCoupons({ redemptionEnabled: false });
    const user = await memberWith(5000);

    expect(await codeOf(() => issueCoupon(user._id.toString(), 5000))).toBe("REDEMPTION_DISABLED");
    expect(await Coupon.countDocuments({ user: user._id })).toBe(0);
  });

  /*
    The reason this whole module exists. The old design checked the balance,
    redirected, and debited only on an external callback — so ten tabs passed
    the same check and minted ten coupons against one balance. Here the check
    and the debit are the same transaction.
  */
  it("leaves exactly one coupon and a non-negative wallet under concurrent attempts", async () => {
    const user = await memberWith(5000);
    const userId = user._id.toString();

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => issueCoupon(userId, 5000)),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await Coupon.countDocuments({ user: user._id })).toBe(1);

    const wallet = await getWallet(userId);
    expect(wallet.total).toBe(0);
    expect(wallet.total).toBeGreaterThanOrEqual(0);
    expect(wallet.quiz).toBeGreaterThanOrEqual(0);
    expect(wallet.referral).toBeGreaterThanOrEqual(0);
    expect(wallet.activity).toBeGreaterThanOrEqual(0);

    // One debit, not five.
    expect(
      await WalletTransaction.countDocuments({ user: user._id, referenceType: "Coupon" }),
    ).toBe(1);
  });

  it("issues two coupons when the balance genuinely covers both", async () => {
    const user = await memberWith(10_000);
    const userId = user._id.toString();

    const first = await issueCoupon(userId, 5000);
    const second = await issueCoupon(userId, 5000);

    expect(first.code).not.toBe(second.code);
    expect((await getWallet(userId)).total).toBe(0);
    expect(await listCoupons(userId)).toHaveLength(2);
  });
});

describe("lookup", () => {
  it("finds a coupon by code and validates it", async () => {
    const user = await memberWith(5000);
    const issued = await issueCoupon(user._id.toString(), 5000);

    const found = await getCouponByCode(issued.code.toLowerCase());
    expect(found?.id).toBe(issued.id);

    const check = await validateCoupon(issued.code);
    expect(check.valid).toBe(true);
    expect(check.reason).toBeNull();
    expect(check.coupon?.valueRupees).toBe(500);
  });

  it("reports an unknown code rather than throwing", async () => {
    const check = await validateCoupon("BHAV-2345-6789-ABCD");
    expect(check.valid).toBe(false);
    expect(check.reason).toBe("NOT_FOUND");
    expect(check.coupon).toBeNull();
  });
});

describe("redeemCoupon", () => {
  it("redeems exactly once", async () => {
    const user = await memberWith(5000);
    const issued = await issueCoupon(user._id.toString(), 5000);

    const redeemed = await redeemCoupon(issued.code, "JMD-ORDER-1");
    expect(redeemed.status).toBe(CouponStatus.REDEEMED);
    expect(redeemed.externalRef).toBe("JMD-ORDER-1");
    expect(redeemed.redeemedAt).not.toBeNull();

    expect(await codeOf(() => redeemCoupon(issued.code, "JMD-ORDER-2"))).toBe("ALREADY_REDEEMED");

    // The first order id stands; the second attempt overwrote nothing.
    const stored = await Coupon.findOne({ code: issued.code }).lean();
    expect(stored?.externalRef).toBe("JMD-ORDER-1");

    const check = await validateCoupon(issued.code);
    expect(check.valid).toBe(false);
    expect(check.reason).toBe("ALREADY_REDEEMED");
  });

  it("survives concurrent redemption attempts on the same code", async () => {
    const user = await memberWith(5000);
    const issued = await issueCoupon(user._id.toString(), 5000);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) => redeemCoupon(issued.code, `JMD-${i}`)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    // Every loser must be told the truth — "already used", never "expired".
    const codes = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => (r.reason instanceof DomainError ? r.reason.code : String(r.reason)));
    expect(codes).toEqual(["ALREADY_REDEEMED", "ALREADY_REDEEMED", "ALREADY_REDEEMED", "ALREADY_REDEEMED"]);
  });

  it("refuses an expired coupon, even before the sweep has flipped it", async () => {
    const user = await memberWith(5000);
    const issued = await issueCoupon(user._id.toString(), 5000);

    await Coupon.updateOne(
      { code: issued.code },
      { $set: { expiresAt: new Date(Date.now() - DAY_MS) } },
    );

    // Still stored as ACTIVE — the filter, not the sweep, is what stops this.
    const stored = await Coupon.findOne({ code: issued.code }).lean();
    expect(stored?.status).toBe(CouponStatus.ACTIVE);

    expect(await codeOf(() => redeemCoupon(issued.code, "JMD-LATE"))).toBe("EXPIRED");

    const check = await validateCoupon(issued.code);
    expect(check.valid).toBe(false);
    expect(check.reason).toBe("EXPIRED");
    expect(check.coupon?.status).toBe(CouponStatus.EXPIRED);
    expect(check.coupon?.daysRemaining).toBe(0);
  });

  it("rejects an unknown code", async () => {
    expect(await codeOf(() => redeemCoupon("BHAV-2345-6789-ABCD", "JMD-X"))).toBe("NOT_FOUND");
  });
});

describe("expireCoupons", () => {
  it("expires lapsed coupons WITHOUT refunding the points", async () => {
    const user = await memberWith(5000);
    const userId = user._id.toString();
    const issued = await issueCoupon(userId, 5000);

    await Coupon.updateOne(
      { code: issued.code },
      { $set: { expiresAt: new Date(Date.now() - DAY_MS) } },
    );

    const result = await expireCoupons();
    expect(result.expired).toBe(1);
    expect(result.pointsForfeited).toBe(5000);

    const stored = await Coupon.findOne({ code: issued.code }).lean();
    expect(stored?.status).toBe(CouponStatus.EXPIRED);

    // The forfeit is the whole point: the balance stays where it was.
    expect((await getWallet(userId)).total).toBe(0);

    // ...but it is written down where the member will look for it.
    const audit = await WalletTransaction.findOne({
      idempotencyKey: `coupon-expiry:${issued.code}`,
    });
    expect(audit).not.toBeNull();
    expect(audit?.points).toBe(0);
    expect(audit?.description).toContain(issued.code);
    expect(audit?.description).toContain("not returned");
  });

  it("leaves unexpired and already-redeemed coupons alone, and is re-runnable", async () => {
    const user = await memberWith(10_000);
    const userId = user._id.toString();
    const live = await issueCoupon(userId, 5000);
    const used = await issueCoupon(userId, 5000);
    await redeemCoupon(used.code, "JMD-ORDER-9");

    // Backdate the redeemed one too — expiry must never reclaim a spent coupon.
    await Coupon.updateOne(
      { code: used.code },
      { $set: { expiresAt: new Date(Date.now() - DAY_MS) } },
    );

    expect((await expireCoupons()).expired).toBe(0);
    expect((await expireCoupons()).expired).toBe(0);

    const stillLive = await getCouponByCode(live.code);
    expect(stillLive?.status).toBe(CouponStatus.ACTIVE);
    const stillUsed = await getCouponByCode(used.code);
    expect(stillUsed?.status).toBe(CouponStatus.REDEEMED);
  });

  it("does not double-write the forfeit record on a second sweep", async () => {
    const user = await memberWith(5000);
    const issued = await issueCoupon(user._id.toString(), 5000);
    await Coupon.updateOne(
      { code: issued.code },
      { $set: { expiresAt: new Date(Date.now() - DAY_MS) } },
    );

    await expireCoupons();
    await expireCoupons();

    expect(
      await WalletTransaction.countDocuments({
        idempotencyKey: `coupon-expiry:${issued.code}`,
      }),
    ).toBe(1);
  });
});
