import { handle, ok } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { getAvailableQuizzes } from "@/server/services/quiz.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Quizzes this member can currently play, with their own attempt state folded
 * in (attempts used, whether this period is already finalised, and the id of an
 * attempt left in progress).
 */
export const GET = handle(async () => {
  const user = await requireUser();
  return ok({ quizzes: await getAvailableQuizzes(user.id) });
});
