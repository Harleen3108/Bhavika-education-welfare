import { handle, ok, fail } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import { submitQuizSchema } from "@/lib/validation/quiz";
import { submitAttempt } from "@/server/services/quiz.service";
import { RATE_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

export const POST = handle(async (req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const rl = await rateLimit(
    `quizSubmit:${user.id}`,
    RATE_LIMITS.quizSubmit.limit,
    RATE_LIMITS.quizSubmit.windowSeconds,
  );
  if (!rl.success) {
    return fail("Too many requests. Please try again shortly.", 429, { code: "RATE_LIMITED" });
  }

  const body = await req.json().catch(() => ({}));
  const { answers } = submitQuizSchema.parse(body);

  const result = await submitAttempt(user.id, id, answers);
  return ok(result);
});
