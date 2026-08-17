import "server-only";
import { Types } from "mongoose";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { dbConnect } from "@/server/db/connect";
import { Wallet, QuizAttempt, User } from "@/server/models";
import { LeaderboardPeriod, AttemptStatus } from "@/lib/enums";
import { SITE } from "@/lib/constants";
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
const TZ = SITE.timezone; // Asia/Kolkata
const DAY_MS = 86_400_000;

type TimeBoxedPeriod = Exclude<LeaderboardPeriod, typeof LeaderboardPeriod.ALL_TIME>;

/**
 * Leaderboard by quiz points. ALL_TIME uses the denormalized
 * `Wallet.lifetimeQuizPoints`; time-boxed boards aggregate `QuizAttempt.score`
 * over a real IST date window. Ranks use competition ranking (ties share a
 * rank, and the next distinct score skips the gap) on every board.
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

// ---------- Period windows ----------

/*
  Boards are time windows, not attempt buckets.

  `QuizAttempt.periodKey` labels the attempt's *cadence* — a DAILY quiz is
  stamped "2026-08-17", a WEEKLY quiz "2026-W34" — because its job is to scope
  the unique index that enforces one attempt per user per period. It is NOT a
  window filter: a daily attempt played this week still belongs on the weekly
  and monthly boards, and no attempt ever carries a monthly key at all. Matching
  a board on `periodKey` equality therefore dropped real scores (see
  src/tests/leaderboard.test.ts). We select on the attempt's finish time inside
  an explicit IST window instead.
*/

/** Midnight (00:00 IST) of an IST calendar date, as the true UTC instant. */
function istMidnight(ymd: string): Date {
  return fromZonedTime(`${ymd}T00:00:00`, TZ);
}

/**
 * Shift an IST calendar date by whole days. Anchored at IST midday so that a
 * timezone whose offset ever shifts by an hour cannot roll into a wrong date.
 */
function shiftDays(ymd: string, days: number): string {
  const anchored = fromZonedTime(`${ymd}T12:00:00`, TZ);
  return formatInTimeZone(new Date(anchored.getTime() + days * DAY_MS), TZ, "yyyy-MM-dd");
}

/** ISO weekday for an IST calendar date: 1 = Monday … 7 = Sunday. */
function isoDayOfWeek(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return dow === 0 ? 7 : dow;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Half-open [start, end) window for a board, with IST calendar boundaries. */
export function periodWindow(
  period: TimeBoxedPeriod,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const today = formatInTimeZone(now, TZ, "yyyy-MM-dd");

  switch (period) {
    case LeaderboardPeriod.DAILY:
      return { start: istMidnight(today), end: istMidnight(shiftDays(today, 1)) };

    case LeaderboardPeriod.WEEKLY: {
      // ISO week: Monday-based, matching the "RRRR-'W'II" keys used elsewhere.
      const monday = shiftDays(today, -(isoDayOfWeek(today) - 1));
      return { start: istMidnight(monday), end: istMidnight(shiftDays(monday, 7)) };
    }

    case LeaderboardPeriod.MONTHLY: {
      const [y, m] = today.split("-").map(Number);
      const nextY = m === 12 ? y + 1 : y;
      const nextM = m === 12 ? 1 : m + 1;
      return {
        start: istMidnight(`${y}-${pad(m)}-01`),
        end: istMidnight(`${nextY}-${pad(nextM)}-01`),
      };
    }
  }
}

// ---------- Boards ----------

async function allTime(userId?: string, limit = DEFAULT_LIMIT): Promise<LeaderboardResult> {
  const top = await Wallet.find({ lifetimeQuizPoints: { $gt: 0 } })
    .sort({ lifetimeQuizPoints: -1, _id: 1 })
    .limit(limit)
    .populate<{ user: { _id: Types.ObjectId; name: string; avatarUrl?: string } }>(
      "user",
      "name avatarUrl",
    )
    .lean();

  // Competition ranking: `me.rank` counts everyone strictly ahead, so the rows
  // must tie the same way or a tied member sees two different numbers.
  let tiedRank = 0;
  let tiedPoints: number | null = null;

  const rows: LeaderboardRow[] = top.map((w, i) => {
    const points = w.lifetimeQuizPoints;
    if (points !== tiedPoints) {
      tiedRank = i + 1;
      tiedPoints = points;
    }
    return {
      rank: tiedRank,
      userId: w.user?._id?.toString() ?? "",
      name: w.user ? toDisplayName(w.user.name) : "Member",
      avatarUrl: w.user?.avatarUrl ?? "",
      points,
      isMe: Boolean(userId) && w.user?._id?.toString() === userId,
    };
  });

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

type RankedGroup = { _id: Types.ObjectId; points: number; rank: number };

async function timeBoxed(
  period: TimeBoxedPeriod,
  userId?: string,
  limit = DEFAULT_LIMIT,
): Promise<LeaderboardResult> {
  const { start, end } = periodWindow(period);

  /*
    Finalized attempts always stamp `submittedAt` (both the submit path and the
    expiry sweep in quiz.service). The second branch is a safety net for any row
    that predates that guarantee, so a missing timestamp cannot silently drop a
    member off the board again.
  */
  const match = {
    status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED] },
    $or: [
      { submittedAt: { $gte: start, $lt: end } },
      { submittedAt: null, createdAt: { $gte: start, $lt: end } },
    ],
  };

  // One pass: rank every scoring member, then slice the page and the caller's
  // own row out of the same ranked set, so the two can never disagree.
  const [faceted] = await QuizAttempt.aggregate<{ top: RankedGroup[]; me: RankedGroup[] }>([
    { $match: match },
    { $group: { _id: "$user", points: { $sum: "$score" } } },
    { $match: { points: { $gt: 0 } } },
    {
      $setWindowFields: {
        sortBy: { points: -1 },
        output: { rank: { $rank: {} } },
      },
    },
    {
      $facet: {
        top: [{ $sort: { points: -1, _id: 1 } }, { $limit: limit }],
        me: userId ? [{ $match: { _id: new Types.ObjectId(userId) } }] : [{ $limit: 0 }],
      },
    },
  ]);

  const top = faceted?.top ?? [];
  const users = await User.find({ _id: { $in: top.map((g) => g._id) } })
    .select("name avatarUrl")
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const rows: LeaderboardRow[] = top.map((g) => {
    const u = userMap.get(g._id.toString());
    return {
      rank: g.rank,
      userId: g._id.toString(),
      name: u ? toDisplayName(u.name) : "Member",
      avatarUrl: u?.avatarUrl ?? "",
      points: g.points,
      isMe: Boolean(userId) && g._id.toString() === userId,
    };
  });

  let me: LeaderboardResult["me"] = null;
  if (userId) {
    const mine = faceted?.me?.[0];
    me = { rank: mine?.rank ?? null, points: mine?.points ?? 0 };
  }

  return { period, rows, me };
}
