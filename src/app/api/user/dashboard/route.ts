import { handle, ok } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { getDashboardData } from "@/server/services/dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The member's overview screen in one request: wallet snapshot, recent ledger
 * entries, referral counters, today's quizzes and the leaderboard preview.
 *
 * `account` carries the same status the website reads off the session, so the
 * app can show the "verify your email" banner without a second call.
 */
export const GET = handle(async () => {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  return ok({
    ...data,
    account: { name: user.name, email: user.email, status: user.status },
  });
});
