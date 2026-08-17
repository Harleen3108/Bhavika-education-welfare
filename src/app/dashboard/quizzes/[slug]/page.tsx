import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MailWarning, Ban, CalendarX } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { getQuizPageData, getResult } from "@/server/services/quiz.service";
import { EmptyState, Alert } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { QuizResult } from "@/components/quiz/QuizResult";

export const metadata: Metadata = { title: "Quiz", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function QuizPlayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSessionUser();
  const data = await getQuizPageData(slug, session!.id);
  if (!data) notFound();

  return (
    <div>
      <Link
        href="/dashboard/quizzes"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-brand-700"
      >
        <ArrowLeft size={16} /> All quizzes
      </Link>

      {data.eligibility === "NOT_ACTIVE" && (
        <EmptyState
          icon={<CalendarX size={40} />}
          title="This quiz isn't available"
          description="It may not have started yet, or it has already closed. Explore other quizzes."
          action={<ButtonLink href="/dashboard/quizzes">Browse quizzes</ButtonLink>}
        />
      )}

      {data.eligibility === "NOT_VERIFIED" && (
        <div className="mx-auto max-w-lg">
          <Alert tone="warning" title="Verify your email first">
            <div className="mt-1 flex items-start gap-2">
              <MailWarning size={18} className="mt-0.5 shrink-0" />
              <span>Please verify your email to take quizzes and earn points. Check your inbox for the verification link.</span>
            </div>
          </Alert>
        </div>
      )}

      {data.eligibility === "MAX_ATTEMPTS" && (
        <EmptyState
          icon={<Ban size={40} />}
          title="No attempts left"
          description="You've used all your attempts for this quiz in the current period. Come back next time!"
          action={<ButtonLink href="/dashboard/quizzes">Browse quizzes</ButtonLink>}
        />
      )}

      {data.eligibility === "COMPLETED" && data.resultAttemptId && (
        <QuizResult result={await getResult(session!.id, data.resultAttemptId)} />
      )}

      {(data.eligibility === "CAN_START" || data.eligibility === "IN_PROGRESS") && (
        <QuizRunner
          slug={slug}
          autoStart={data.eligibility === "IN_PROGRESS"}
          meta={{
            title: data.title,
            questionCount: data.questionCount,
            timeLimitSeconds: data.timeLimitSeconds,
          }}
        />
      )}
    </div>
  );
}
