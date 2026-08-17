import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import { creditPoints, getWallet } from "@/server/services/wallet.service";
import { WalletTransaction } from "@/server/models";
import { PointSource, TransactionType } from "@/lib/enums";

const base = (userId: string, idempotencyKey: string, points = 30) => ({
  userId,
  source: PointSource.QUIZ,
  points,
  referenceType: "Test",
  description: "test credit",
  idempotencyKey,
});

describe("wallet.creditPoints", () => {
  it("credits exactly once for a repeated idempotency key", async () => {
    const userId = new Types.ObjectId().toString();
    const first = await creditPoints(base(userId, "dup:1"));
    const second = await creditPoints(base(userId, "dup:1"));

    expect(first.credited).toBe(true);
    expect(second.credited).toBe(false);

    const wallet = await getWallet(userId);
    expect(wallet.total).toBe(30);
    expect(wallet.quiz).toBe(30);
    expect(await WalletTransaction.countDocuments({ user: userId })).toBe(1);
  });

  it("applies exactly one credit under concurrent duplicate calls", async () => {
    const userId = new Types.ObjectId().toString();
    const calls = Array.from({ length: 6 }, () => creditPoints(base(userId, "race:1", 10)));
    const results = await Promise.all(calls);

    expect(results.filter((r) => r.credited).length).toBe(1);
    const wallet = await getWallet(userId);
    expect(wallet.total).toBe(10);
    expect(await WalletTransaction.countDocuments({ user: userId })).toBe(1);
  });

  it("separates buckets and sums the total", async () => {
    const userId = new Types.ObjectId().toString();
    await creditPoints({ userId, source: PointSource.QUIZ, points: 10, referenceType: "T", description: "q", idempotencyKey: "b:q" });
    await creditPoints({ userId, source: PointSource.REFERRAL, points: 50, referenceType: "T", description: "r", idempotencyKey: "b:r" });
    await creditPoints({ userId, source: PointSource.ACTIVITY, points: 20, referenceType: "T", description: "a", idempotencyKey: "b:a" });

    const wallet = await getWallet(userId);
    expect(wallet.quiz).toBe(10);
    expect(wallet.referral).toBe(50);
    expect(wallet.activity).toBe(20);
    expect(wallet.total).toBe(80);
    expect(wallet.lifetimeQuizPoints).toBe(10);
  });

  it("debits reduce the balance", async () => {
    const userId = new Types.ObjectId().toString();
    await creditPoints({ userId, source: PointSource.QUIZ, points: 100, referenceType: "T", description: "c", idempotencyKey: "d:1" });
    await creditPoints({
      userId,
      source: PointSource.FUTURE_REDEMPTION,
      type: TransactionType.DEBIT,
      points: 40,
      referenceType: "T",
      description: "redeem",
      idempotencyKey: "d:2",
    });
    const wallet = await getWallet(userId);
    expect(wallet.total).toBe(60);
  });
});
