import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from "vitest";
import { issueCoupon, redeemCoupon, expireCoupons } from "@/server/services/coupon.service";
import { creditPoints, getWallet } from "@/server/services/wallet.service";
import { Coupon, SystemSettings, Wallet, WalletTransaction } from "@/server/models";
import { CouponStatus, PointSource } from "@/lib/enums";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { DomainError } from "@/server/errors";
import { makeUser } from "./helpers";

const DAY_MS = 86_400_000;

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

beforeAll(async () => {
  await Coupon.syncIndexes();
});

beforeEach(async () => {
  await enableCoupons();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ADVERSARIAL: issueCoupon under heavy concurrency", () => {
  it("20 simultaneous issues against one 5,000 balance yield exactly one coupon", async () => {
    const user = await makeUser();
    await creditPoints({
      userId: user._id,
      source: PointSource.QUIZ,
      points: 5000,
      referenceType: "Test",
      description: "seed",
      idempotencyKey: `seed-a:${user._id.toString()}`,
    });
    const userId = user._id.toString();

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => issueCoupon(userId, 5000)),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);
    expect(await Coupon.countDocuments({ user: user._id })).toBe(1);

    const w = await getWallet(userId);
    expect(w.total).toBe(0);
    expect(w.quiz).toBeGreaterThanOrEqual(0);
    expect(w.referral).toBeGreaterThanOrEqual(0);
    expect(w.activity).toBeGreaterThanOrEqual(0);
    expect(w.quiz + w.referral + w.activity).toBe(w.total);

    expect(
      await WalletTransaction.countDocuments({ user: user._id, referenceType: "Coupon" }),
    ).toBe(1);

    // Every loser must be a clean domain refusal, not a leaked driver error.
    for (const r of results) {
      if (r.status === "rejected") {
        expect(r.reason).toBeInstanceOf(DomainError);
      }
    }
  });

  it("concurrent issues across MIXED buckets never drive a sub-balance negative", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    for (const [source, points] of [
      [PointSource.QUIZ, 3000],
      [PointSource.REFERRAL, 3000],
      [PointSource.ACTIVITY, 4000],
    ] as const) {
      await creditPoints({
        userId: user._id,
        source,
        points,
        referenceType: "Test",
        description: "seed",
        idempotencyKey: `seed-b:${source}:${userId}`,
      });
    }
    expect((await getWallet(userId)).total).toBe(10_000);

    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () => issueCoupon(userId, 5000)),
    );

    const issued = await Coupon.find({ user: user._id }).lean();
    const spent = issued.reduce((s, c) => s + c.pointsSpent, 0);
    expect(spent).toBeLessThanOrEqual(10_000);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(issued.length);

    const w = await getWallet(userId);
    expect(w.total).toBe(10_000 - spent);
    expect(w.total).toBeGreaterThanOrEqual(0);
    expect(w.quiz).toBeGreaterThanOrEqual(0);
    expect(w.referral).toBeGreaterThanOrEqual(0);
    expect(w.activity).toBeGreaterThanOrEqual(0);
    // The invariant the whole wallet UI depends on.
    expect(w.quiz + w.referral + w.activity).toBe(w.total);
  });

  it("concurrent issues of DIFFERENT sizes cannot together exceed the balance", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    await creditPoints({
      userId: user._id,
      source: PointSource.QUIZ,
      points: 10_000,
      referenceType: "Test",
      description: "seed",
      idempotencyKey: `seed-c:${userId}`,
    });

    const amounts = [5000, 5500, 6000, 10_000, 5000, 7500, 5000, 8000];
    const results = await Promise.allSettled(amounts.map((p) => issueCoupon(userId, p)));

    const issued = await Coupon.find({ user: user._id }).lean();
    const spent = issued.reduce((s, c) => s + c.pointsSpent, 0);
    expect(spent).toBeLessThanOrEqual(10_000);

    const w = await getWallet(userId);
    expect(w.total).toBe(10_000 - spent);
    expect(w.total).toBeGreaterThanOrEqual(0);

    // Ledger and coupons agree: one debit per coupon, summing to the spend.
    const debits = await WalletTransaction.find({ user: user._id, referenceType: "Coupon" }).lean();
    expect(debits).toHaveLength(issued.length);
    expect(debits.reduce((s, d) => s + d.points, 0)).toBe(-spent);
    // Idempotency keys are unique per issuance.
    expect(new Set(debits.map((d) => d.idempotencyKey)).size).toBe(debits.length);
    expect(new Set(issued.map((c) => c.code)).size).toBe(issued.length);

    for (const r of results) {
      if (r.status === "rejected") expect(r.reason).toBeInstanceOf(DomainError);
    }
  });

  it("a failure AFTER the debit rolls the debit back — no points lost without a coupon", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    await creditPoints({
      userId: user._id,
      source: PointSource.QUIZ,
      points: 5000,
      referenceType: "Test",
      description: "seed",
      idempotencyKey: `seed-d:${userId}`,
    });

    // Blow up at the coupon insert, i.e. strictly after the wallet has been
    // decremented inside the transaction.
    const spy = vi.spyOn(Coupon, "create").mockRejectedValue(new Error("boom") as never);

    await expect(issueCoupon(userId, 5000)).rejects.toThrow();
    spy.mockRestore();

    const w = await getWallet(userId);
    expect(w.total).toBe(5000);
    expect(w.quiz).toBe(5000);
    expect(await Coupon.countDocuments({ user: user._id })).toBe(0);
    expect(
      await WalletTransaction.countDocuments({ user: user._id, referenceType: "Coupon" }),
    ).toBe(0);
  });

  it("a failure at the LEDGER write rolls back both the debit and the coupon", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    await creditPoints({
      userId: user._id,
      source: PointSource.QUIZ,
      points: 5000,
      referenceType: "Test",
      description: "seed",
      idempotencyKey: `seed-e:${userId}`,
    });

    const spy = vi
      .spyOn(WalletTransaction, "create")
      .mockRejectedValue(new Error("ledger down") as never);

    await expect(issueCoupon(userId, 5000)).rejects.toThrow();
    spy.mockRestore();

    expect((await getWallet(userId)).total).toBe(5000);
    // No coupon may survive a rolled-back debit — that would be free money.
    expect(await Coupon.countDocuments({ user: user._id })).toBe(0);
  });
});

describe("ADVERSARIAL: redeemCoupon under heavy concurrency", () => {
  it("30 simultaneous redemptions of one code produce exactly one winner", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    await creditPoints({
      userId: user._id,
      source: PointSource.QUIZ,
      points: 5000,
      referenceType: "Test",
      description: "seed",
      idempotencyKey: `seed-f:${userId}`,
    });
    const coupon = await issueCoupon(userId, 5000);

    const results = await Promise.allSettled(
      Array.from({ length: 30 }, (_, i) => redeemCoupon(coupon.code, `ORDER-${i}`)),
    );

    const winners = results.filter((r) => r.status === "fulfilled");
    expect(winners).toHaveLength(1);

    const stored = await Coupon.findOne({ code: coupon.code }).lean();
    expect(stored?.status).toBe(CouponStatus.REDEEMED);
    // The stored order reference is the winner's, not a loser's.
    const won = winners[0] as PromiseFulfilledResult<{ externalRef: string | null }>;
    expect(stored?.externalRef).toBe(won.value.externalRef);

    for (const r of results) {
      if (r.status === "rejected") {
        expect(r.reason).toBeInstanceOf(DomainError);
        expect((r.reason as DomainError).code).toBe("ALREADY_REDEEMED");
      }
    }

    // Redeeming moves no points: the debit happened at issue time only.
    expect((await getWallet(userId)).total).toBe(0);
    expect(
      await WalletTransaction.countDocuments({ user: user._id, referenceType: "Coupon" }),
    ).toBe(1);
  });

  it("a coupon cannot be redeemed after expiry even racing the sweep", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    await creditPoints({
      userId: user._id,
      source: PointSource.QUIZ,
      points: 5000,
      referenceType: "Test",
      description: "seed",
      idempotencyKey: `seed-g:${userId}`,
    });
    const coupon = await issueCoupon(userId, 5000);
    await Coupon.updateOne(
      { code: coupon.code },
      { $set: { expiresAt: new Date(Date.now() - DAY_MS) } },
    );

    const [redeem, sweep] = await Promise.allSettled([
      redeemCoupon(coupon.code, "ORDER-RACE"),
      expireCoupons(),
    ]);

    expect(redeem.status).toBe("rejected");
    expect(sweep.status).toBe("fulfilled");

    const stored = await Coupon.findOne({ code: coupon.code }).lean();
    expect(stored?.status).toBe(CouponStatus.EXPIRED);
    expect(stored?.externalRef).toBeNull();
  });
});

describe("ADVERSARIAL: a coupon code can never be minted twice", () => {
  it("enforces uniqueness at the index, not just in the generator's pre-check", async () => {
    const indexes = await Coupon.collection.indexes();
    const codeIndex = indexes.find((i) => i.key?.code === 1);
    expect(codeIndex?.unique).toBe(true);

    const user = await makeUser();
    const userId = user._id.toString();
    await creditPoints({
      userId: user._id,
      source: PointSource.QUIZ,
      points: 5000,
      referenceType: "Test",
      description: "seed",
      idempotencyKey: `seed-i:${userId}`,
    });
    const coupon = await issueCoupon(userId, 5000);

    // The generator's `exists` pre-check cannot see an uncommitted concurrent
    // insert, so the index is the only real guarantee. Prove it bites.
    await expect(
      Coupon.create({
        code: coupon.code,
        user: user._id,
        valueRupees: 500,
        pointsSpent: 5000,
        expiresAt: new Date(Date.now() + DAY_MS),
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });
});

describe("ADVERSARIAL: expiry never moves money", () => {
  it("sweeping expired coupons leaves every balance byte-for-byte unchanged", async () => {
    const user = await makeUser();
    const userId = user._id.toString();
    await creditPoints({
      userId: user._id,
      source: PointSource.QUIZ,
      points: 12_000,
      referenceType: "Test",
      description: "seed",
      idempotencyKey: `seed-h:${userId}`,
    });
    const a = await issueCoupon(userId, 5000);
    const b = await issueCoupon(userId, 5000);
    await Coupon.updateMany(
      { code: { $in: [a.code, b.code] } },
      { $set: { expiresAt: new Date(Date.now() - DAY_MS) } },
    );

    const before = await Wallet.findOne({ user: user._id }).lean();
    const result = await expireCoupons();
    const after = await Wallet.findOne({ user: user._id }).lean();

    expect(result.expired).toBe(2);
    expect(result.pointsForfeited).toBe(10_000);
    expect(after?.totalBalance).toBe(before?.totalBalance);
    expect(after?.quizBalance).toBe(before?.quizBalance);
    expect(after?.referralBalance).toBe(before?.referralBalance);
    expect(after?.activityBalance).toBe(before?.activityBalance);
    expect(after?.totalBalance).toBe(2000);

    // Concurrent sweeps must not double-write the forfeit record either.
    await Promise.all([expireCoupons(), expireCoupons(), expireCoupons()]);
    expect(
      await WalletTransaction.countDocuments({ idempotencyKey: `coupon-expiry:${a.code}` }),
    ).toBe(1);
    expect((await getWallet(userId)).total).toBe(2000);
  });
});
