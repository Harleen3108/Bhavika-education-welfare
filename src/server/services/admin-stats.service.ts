import "server-only";
import { dbConnect } from "@/server/db/connect";
import {
  User,
  Quiz,
  QuizAttempt,
  Referral,
  WalletTransaction,
  ContactSubmission,
} from "@/server/models";
import { AccountStatus, ReferralStatus, ContactStatus, TransactionType } from "@/lib/enums";
import { dailyKey } from "@/lib/periods";

export type AdminStats = {
  users: { total: number; active: number; pending: number; newToday: number };
  quizzes: { total: number; attemptsToday: number };
  referrals: { total: number; rewarded: number };
  points: { totalIssued: number };
  contacts: { new: number };
};

export async function getAdminStats(): Promise<AdminStats> {
  await dbConnect();
  const todayKey = dailyKey();

  const [
    totalUsers,
    activeUsers,
    pendingUsers,
    newTodayUsers,
    totalQuizzes,
    attemptsToday,
    totalReferrals,
    rewardedReferrals,
    pointsAgg,
    newContacts,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ status: AccountStatus.ACTIVE }),
    User.countDocuments({ status: AccountStatus.PENDING }),
    User.countDocuments({ createdAt: { $gte: startOfTodayUTCFromKey() } }),
    Quiz.countDocuments({}),
    QuizAttempt.countDocuments({ periodKey: todayKey }),
    Referral.countDocuments({}),
    Referral.countDocuments({ status: ReferralStatus.REWARDED }),
    WalletTransaction.aggregate<{ total: number }>([
      { $match: { type: TransactionType.CREDIT } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]),
    ContactSubmission.countDocuments({ status: ContactStatus.NEW }),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      pending: pendingUsers,
      newToday: newTodayUsers,
    },
    quizzes: { total: totalQuizzes, attemptsToday },
    referrals: { total: totalReferrals, rewarded: rewardedReferrals },
    points: { totalIssued: pointsAgg[0]?.total ?? 0 },
    contacts: { new: newContacts },
  };
}

// Approximate "today" boundary (UTC midnight). Good enough for a dashboard stat.
function startOfTodayUTCFromKey(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
