import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { getAvailableQuizzes } from "@/server/services/quiz.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { QuizListCard } from "@/components/quiz/QuizListCard";
import { QuizType } from "@/lib/enums";

export const metadata: Metadata = { title: "Quizzes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function QuizzesPage() {
  const session = await getSessionUser();
  const quizzes = await getAvailableQuizzes(session!.id);
  const daily = quizzes.filter((q) => q.type === QuizType.DAILY);
  const weekly = quizzes.filter((q) => q.type === QuizType.WEEKLY);

  return (
    <>
      <PageHeader title="Quizzes" description="Take quizzes to learn and earn points." />

      {quizzes.length === 0 ? (
        <EmptyState
          icon={<Trophy size={40} />}
          title="No quizzes available right now"
          description="New daily and weekly quizzes appear here as they go live. Check back soon!"
        />
      ) : (
        <div className="space-y-8">
          {daily.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-ink-900">Daily quizzes</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {daily.map((q) => <QuizListCard key={q.id} quiz={q} />)}
              </div>
            </section>
          )}
          {weekly.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-ink-900">Weekly quizzes</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {weekly.map((q) => <QuizListCard key={q.id} quiz={q} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
