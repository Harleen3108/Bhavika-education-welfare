import { formatInTimeZone } from "date-fns-tz";
import { SITE } from "@/lib/constants";
import { QuizType, LeaderboardPeriod } from "@/lib/enums";

const TZ = SITE.timezone; // Asia/Kolkata

/**
 * Deterministic period keys computed in the foundation's timezone (IST), so
 * "daily"/"weekly" boundaries are consistent for every user regardless of their
 * device clock. These keys scope quiz attempts and leaderboard aggregation.
 */

export function dailyKey(d: Date = new Date()): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd"); // e.g. 2026-08-12
}

export function weeklyKey(d: Date = new Date()): string {
  // ISO week-year + week number, e.g. 2026-W33
  return formatInTimeZone(d, TZ, "RRRR-'W'II");
}

export function monthlyKey(d: Date = new Date()): string {
  return formatInTimeZone(d, TZ, "yyyy-MM"); // e.g. 2026-08
}

/** Period key for a quiz attempt, based on the quiz's cadence. */
export function periodKeyForQuiz(type: QuizType, d: Date = new Date()): string {
  return type === QuizType.DAILY ? dailyKey(d) : weeklyKey(d);
}

/** Period key for a leaderboard window. */
export function periodKeyFor(period: LeaderboardPeriod, d: Date = new Date()): string {
  switch (period) {
    case LeaderboardPeriod.DAILY:
      return dailyKey(d);
    case LeaderboardPeriod.WEEKLY:
      return weeklyKey(d);
    case LeaderboardPeriod.MONTHLY:
      return monthlyKey(d);
    case LeaderboardPeriod.ALL_TIME:
      return "ALL_TIME";
  }
}
