import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { QuizList } from "@/components/admin/QuizList";
import { adminListQuizzes } from "@/server/services/admin-read.service";

export const metadata: Metadata = { title: "Quizzes — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminQuizzesPage() {
  const quizzes = await adminListQuizzes();
  return (
    <>
      <PageHeader title="Quiz management" description="Create and manage daily and weekly quizzes." />
      <QuizList quizzes={quizzes} />
    </>
  );
}
