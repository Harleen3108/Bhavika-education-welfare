import { handle, ok, fail } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import { startAttempt } from "@/server/services/quiz.service";
import { RATE_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

export const POST = handle(async (req, ctx) => {
  const user = await requireUser();
  const { slug } = await ctx.params;

  const rl = await rateLimit(
    `quizStart:${user.id}`,
    RATE_LIMITS.quizStart.limit,
    RATE_LIMITS.quizStart.windowSeconds,
  );
  if (!rl.success) {
    return fail("Too many attempts. Please slow down.", 429, { code: "RATE_LIMITED" });
  }

  const result = await startAttempt(user.id, slug);
  return ok(result);
});
