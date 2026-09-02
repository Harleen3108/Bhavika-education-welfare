import { describe, it, expect, beforeAll } from "vitest";
import { isCronAuthorized } from "@/server/cron-auth";
import { issueCoupon, expireCoupons } from "@/server/services/coupon.service";
import { creditPoints } from "@/server/services/wallet.service";
import { Coupon, WalletTransaction, SystemSettings } from "@/server/models";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { PointSource, CouponStatus } from "@/lib/enums";
import { makeUser } from "./helpers";

const DAY_MS = 86_400_000;

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/cron/expire-coupons", { headers });
}

beforeAll(async () => {
  await Coupon.syncIndexes();
});

describe("cron auth (isCronAuthorized)", () => {
  it("accepts only the exact Bearer cron secret", () => {
    expect(isCronAuthorized(req())).toBe(false);
    expect(isCronAuthorized(req({ authorization: "Bearer wrong" }))).toBe(false);
    expect(isCronAuthorized(req({ authorization: process.env.CRON_SECRET! }))).toBe(false);
    expect(isCronAuthorized(req({ authorization: `Bearer ${process.env.CRON_SECRET}` }))).toBe(true);
  });
});

describe("coupon expiry sweep (what the cron runs)", () => {
  it("flips lapsed coupons to EXPIRED and writes the forfeit ledger row once", async () => {
    await SystemSettings.findOneAndUpdate(
      { singleton: "global" },
      { $set: { integration: { ...DEFAULT_SETTINGS.integration, redemptionEnabled: true } } },
      { upsert: true, new: true },
    );
    const user = await makeUser();
    await creditPoints({
      userId: user._id,
      source: PointSource.QUIZ,
      points: 5000,
      referenceType: "Test",
      description: "seed",
      idempotencyKey: `seed:${user._id.toString()}`,
    });
    const coupon = await issueCoupon(user._id.toString(), 5000);
    await Coupon.updateOne({ code: coupon.code }, { $set: { expiresAt: new Date(Date.now() - DAY_MS) } });

    const result = await expireCoupons();
    expect(result.expired).toBe(1);
    expect(result.pointsForfeited).toBe(5000);

    expect((await Coupon.findOne({ code: coupon.code }).lean())?.status).toBe(CouponStatus.EXPIRED);
    expect(
      await WalletTransaction.countDocuments({ idempotencyKey: `coupon-expiry:${coupon.code}` }),
    ).toBe(1);
  });
});
