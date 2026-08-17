import "server-only";
import { dbConnect } from "@/server/db/connect";
import {
  Wallet,
  WalletTransaction,
  Referral,
  Quiz,
  QuizAttempt,
  User,
} from "@/server/models";
import { QuizType, QuizStatus, ReferralStatus, AttemptStatus } from "@/lib/enums";
import { periodKeyForQuiz } from "@/lib/periods";
import { toDisplayName } from "@/lib/utils";

export type DashboardData = {
  wallet: { total: number; quiz: number; referral: number; activity: number };
  recentTransactions: {
    id: string;
    source: string;
    type: string;
    points: number;
    description: string;
    createdAt: string;
  }[];
  referrals: { code: string; total: number; pending: number; rewarded: number };
  availableQuizzes: {
    daily: QuizCardData | null;
    weekly: QuizCardData | null;
  };
  leaderboard: { rank: number; name: string; points: number; avatarUrl: string }[];
};

type QuizCardData = {
  id: string;
  title: string;
  slug: string;
  type: string;
  questionCount: number;
  timeLimitSeconds: number;
  attemptedThisPeriod: boolean;
};

async function getAvailableQuiz(
  userId: string,
  type: QuizType,
): Promise<QuizCardData | null> {
  const now = new Date();
  const quiz = await Quiz.findOne({
    type,
    status: QuizStatus.ACTIVE,
    startAt: { $lte: now },
    endAt: { $gte: now },
  })
    .sort({ startAt: -1 })
    .lean();
  if (!quiz) return null;

  const periodKey = periodKeyForQuiz(type, now);
  const attempt = await QuizAttempt.findOne({
    user: userId,
    quiz: quiz._id,
    periodKey,
    status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED] },
  }).select("_id");

  return {
    id: quiz._id.toString(),
    title: quiz.title,
    slug: quiz.slug,
    type: quiz.type,
    questionCount: quiz.questions.length,
    timeLimitSeconds: quiz.timeLimitSeconds,
    attemptedThisPeriod: Boolean(attempt),
  };
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  await dbConnect();

  const [wallet, txns, refAgg, daily, weekly, self, topWallets] = await Promise.all([
    Wallet.findOne({ user: userId }).lean(),
    WalletTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean(),
    Referral.aggregate<{ _id: string; count: number }>([
      { $match: { referrer: toObjectId(userId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    getAvailableQuiz(userId, QuizType.DAILY),
    getAvailableQuiz(userId, QuizType.WEEKLY),
    User.findById(userId).select("referralCode").lean(),
    // Leaderboard preview: top 5 by lifetime quiz points.
    Wallet.find({ lifetimeQuizPoints: { $gt: 0 } })
      .sort({ lifetimeQuizPoints: -1 })
      .limit(5)
      .populate<{ user: { name: string; avatarUrl?: string } }>("user", "name avatarUrl")
      .lean(),
  ]);

  const refCounts = { total: 0, pending: 0, rewarded: 0 };
  for (const r of refAgg) {
    refCounts.total += r.count;
    if (r._id === ReferralStatus.PENDING || r._id === ReferralStatus.QUALIFIED)
      refCounts.pending += r.count;
    if (r._id === ReferralStatus.REWARDED) refCounts.rewarded += r.count;
  }

  return {
    wallet: {
      total: wallet?.totalBalance ?? 0,
      quiz: wallet?.quizBalance ?? 0,
      referral: wallet?.referralBalance ?? 0,
      activity: wallet?.activityBalance ?? 0,
    },
    recentTransactions: txns.map((t) => ({
      id: t._id.toString(),
      source: t.source,
      type: t.type,
      points: t.points,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    referrals: {
      code: self?.referralCode ?? "",
      total: refCounts.total,
      pending: refCounts.pending,
      rewarded: refCounts.rewarded,
    },
    availableQuizzes: { daily, weekly },
    leaderboard: topWallets.map((w, i) => ({
      rank: i + 1,
      name: w.user ? toDisplayName(w.user.name) : "Member",
      points: w.lifetimeQuizPoints,
      avatarUrl: w.user?.avatarUrl ?? "",
    })),
  };
}

// Local helper to avoid importing mongoose Types in a hot path.
import { Types } from "mongoose";
function toObjectId(id: string) {
  return new Types.ObjectId(id);
}
