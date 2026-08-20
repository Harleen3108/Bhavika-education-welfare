import { handle, ok } from "@/server/http";
import { getSessionUser } from "@/server/auth/session";
import { getLeaderboard } from "@/server/services/leaderboard.service";
import { LeaderboardPeriod } from "@/lib/enums";

export const runtime = "nodejs";
// Reads live rankings and an optional session, so it must never be cached.
export const dynamic = "force-dynamic";

const PERIODS = new Set<string>(Object.values(LeaderboardPeriod));

/**
 * Rankings for one period.
 *
 * Deliberately open to signed-out callers, exactly like /leaderboard on the
 * website: when a session IS present the service marks the caller's row and
 * returns their own rank, so the app needs no second "my rank" request.
 */
export const GET = handle(async (req) => {
  const sp = new URL(req.url).searchParams;
  const requested = sp.get("period");
  const period =
    requested && PERIODS.has(requested)
      ? (requested as LeaderboardPeriod)
      : LeaderboardPeriod.WEEKLY;

  const rawLimit = Number(sp.get("limit"));
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 25;

  const session = await getSessionUser();
  const board = await getLeaderboard(period, session?.id, limit);

  return ok(board);
});
