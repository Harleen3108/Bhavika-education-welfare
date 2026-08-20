import { handle, ok, fail } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { getQuizPageData } from "@/server/services/quiz.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Eligibility for one quiz — the read the play screen makes before it offers a
 * Start button.
 *
 * Read-only on purpose: it never opens an attempt. Starting stays a POST to
 * `./start`, so a prefetch, a retry or a back-navigation cannot silently burn
 * one of the member's attempts.
 */
export const GET = handle(async (_req, ctx) => {
  const user = await requireUser();
  const { slug } = await ctx.params;
  const data = await getQuizPageData(slug, user.id);
  if (!data) return fail("Quiz not found.", 404, { code: "NOT_FOUND" });
  return ok(data);
});
