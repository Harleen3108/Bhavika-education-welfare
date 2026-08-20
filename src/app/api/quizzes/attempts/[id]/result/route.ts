import { handle, ok } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { getResult } from "@/server/services/quiz.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A finished attempt's full review — score, correct answers and what the member
 * chose.
 *
 * `getResult` is scoped by user id, so an attempt belonging to someone else
 * resolves to nothing rather than leaking another member's answers.
 */
export const GET = handle(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return ok(await getResult(user.id, id));
});
