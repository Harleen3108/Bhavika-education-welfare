import { describe, it, expect } from "vitest";
import { processReferralReward } from "@/server/services/referral.service";
import { getWallet } from "@/server/services/wallet.service";
import { Referral, QuizAttempt } from "@/server/models";
import { ReferralStatus, AttemptStatus } from "@/lib/enums";
import { Types } from "mongoose";
import { makeUser, makeQuiz } from "./helpers";

async function giveCompletedQuiz(userId: string) {
  const quiz = await makeQuiz();
  await QuizAttempt.create({
    user: userId,
    quiz: quiz._id,
    attemptNumber: 1,
    periodKey: "test-period",
    status: AttemptStatus.SUBMITTED,
    startedAt: new Date(),
    expiresAt: new Date(),
    submittedAt: new Date(),
    answers: [],
    score: 20,
    correctCount: 2,
    totalQuestions: 2,
  });
}

describe("referral.processReferralReward", () => {
  it("does not reward until eligibility (first quiz) is met", async () => {
    const referrer = await makeUser();
    const referred = await makeUser();
    await Referral.create({
      referrer: referrer._id,
      referredUser: referred._id,
      referralCode: referrer.referralCode,
      status: ReferralStatus.PENDING,
    });

    const res = await processReferralReward(referred._id.toString());
    expect(res.rewarded).toBe(false);
    const wallet = await getWallet(referrer._id.toString());
    expect(wallet.referral).toBe(0);
  });

  it("rewards the referrer exactly once when eligible", async () => {
    const referrer = await makeUser();
    const referred = await makeUser();
    await Referral.create({
      referrer: referrer._id,
      referredUser: referred._id,
      referralCode: referrer.referralCode,
      status: ReferralStatus.PENDING,
    });
    await giveCompletedQuiz(referred._id.toString());

    const first = await processReferralReward(referred._id.toString());
    const second = await processReferralReward(referred._id.toString());

    expect(first.rewarded).toBe(true);
    expect(second.rewarded).toBe(false);

    const wallet = await getWallet(referrer._id.toString());
    expect(wallet.referral).toBe(50); // default referrerReward, credited once

    const ref = await Referral.findOne({ referredUser: referred._id });
    expect(ref?.status).toBe(ReferralStatus.REWARDED);
  });

  it("rejects a self-referral", async () => {
    const user = await makeUser();
    await Referral.create({
      referrer: user._id,
      referredUser: user._id,
      referralCode: user.referralCode,
      status: ReferralStatus.PENDING,
    });
    const res = await processReferralReward(user._id.toString());
    expect(res.rewarded).toBe(false);
    const ref = await Referral.findOne({ referredUser: user._id });
    expect(ref?.status).toBe(ReferralStatus.REJECTED);
  });

  it("enforces one referral row per referred user (unique index)", async () => {
    const referredId = new Types.ObjectId();
    const r1 = await makeUser();
    const r2 = await makeUser();
    await Referral.create({ referrer: r1._id, referredUser: referredId, referralCode: r1.referralCode, status: ReferralStatus.PENDING });
    await expect(
      Referral.create({ referrer: r2._id, referredUser: referredId, referralCode: r2.referralCode, status: ReferralStatus.PENDING }),
    ).rejects.toThrow();
  });
});
