import "server-only";
import { Types } from "mongoose";
import { dbConnect } from "@/server/db/connect";
import { Wallet, QuizAttempt, User } from "@/server/models";
import { LeaderboardPeriod, AttemptStatus } from "@/lib/enums";
import { periodKeyFor } from "@/lib/periods";
import { toDisplayName } from "@/lib/utils";

export type LeaderboardRow = {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string;
  points: number;
  isMe: boolean;
};

export type LeaderboardResult = {
  period: LeaderboardPeriod;
  rows: LeaderboardRow[];
  me: { rank: number | null; points: number } | null;
};

const DEFAULT_LIMIT = 20;

/**
 * Leaderboard by quiz points. ALL_TIME uses the denormalized
 * `Wallet.lifetimeQuizPoints`; time-boxed boards aggregate `QuizAttempt.score`
 * for the current period key. Ranks use competition ranking (ties share a rank).
 */
export async function getLeaderboard(
  period: LeaderboardPeriod,
  userId?: string,
  limit = DEFAULT_LIMIT,
): Promise<LeaderboardResult> {
  await dbConnect();
  return period === LeaderboardPeriod.ALL_TIME
    ? allTime(userId, limit)
    : timeBoxed(period, userId, limit);
}

async function allTime(userId?: string, limit = DEFAULT_LIMIT): Promise<LeaderboardResult> {
  const top = await Wallet.find({ lifetimeQuizPoints: { $gt: 0 } })
    .sort({ lifetimeQuizPoints: -1, _id: 1 })
    .limit(limit)
    .populate<{ user: { _id: Types.ObjectId; name: string; avatarUrl?: string } }>(
      "user",
      "name avatarUrl",
    )
    .lean();

  const rows: LeaderboardRow[] = top.map((w, i) => ({
    rank: i + 1,
    userId: w.user?._id?.toString() ?? "",
    name: w.user ? toDisplayName(w.user.name) : "Member",
    avatarUrl: w.user?.avatarUrl ?? "",
    points: w.lifetimeQuizPoints,
    isMe: Boolean(userId) && w.user?._id?.toString() === userId,
  }));

  let me: LeaderboardResult["me"] = null;
  if (userId) {
    const myWallet = await Wallet.findOne({ user: userId }).lean();
    const points = myWallet?.lifetimeQuizPoints ?? 0;
    const rank =
      points > 0
        ? (await Wallet.countDocuments({ lifetimeQuizPoints: { $gt: points } })) + 1
        : null;
    me = { rank, points };
  }

  return { period: LeaderboardPeriod.ALL_TIME, rows, me };
}

async function timeBoxed(
  period: LeaderboardPeriod,
  userId?: string,
  limit = DEFAULT_LIMIT,
): Promise<LeaderboardResult> {
  const periodKey = periodKeyFor(period);
  const match = {
    periodKey,
    status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED] },
  };

  const grouped = await QuizAttempt.aggregate<{ _id: Types.ObjectId; points: number }>([
    { $match: match },
    { $group: { _id: "$user", points: { $sum: "$score" } } },
    { $match: { points: { $gt: 0 } } },
    { $sort: { points: -1, _id: 1 } },
    { $limit: limit },
  ]);

  const userIds = grouped.map((g) => g._id);
  const users = await User.find({ _id: { $in: userIds } })
    .select("name avatarUrl")
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const rows: LeaderboardRow[] = grouped.map((g, i) => {
    const u = userMap.get(g._id.toString());
    return {
      rank: i + 1,
      userId: g._id.toString(),
      name: u ? toDisplayName(u.name) : "Member",
      avatarUrl: u?.avatarUrl ?? "",
      points: g.points,
      isMe: Boolean(userId) && g._id.toString() === userId,
    };
  });

  let me: LeaderboardResult["me"] = null;
  if (userId) {
    const mine = await QuizAttempt.aggregate<{ points: number }>([
      { $match: { ...match, user: new Types.ObjectId(userId) } },
      { $group: { _id: "$user", points: { $sum: "$score" } } },
    ]);
    const points = mine[0]?.points ?? 0;
    let rank: number | null = null;
    if (points > 0) {
      const higher = await QuizAttempt.aggregate<{ count: number }>([
        { $match: match },
        { $group: { _id: "$user", points: { $sum: "$score" } } },
        { $match: { points: { $gt: points } } },
        { $count: "count" },
      ]);
      rank = (higher[0]?.count ?? 0) + 1;
    }
    me = { rank, points };
  }

  return { period, rows, me };
}
