import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { QuizMetaForm } from "@/components/admin/QuizMetaForm";
import { QuestionsEditor } from "@/components/admin/QuestionsEditor";
import { adminGetQuiz } from "@/server/services/admin-read.service";

export const metadata: Metadata = { title: "Edit quiz — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminQuizEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quiz = await adminGetQuiz(id);
  if (!quiz) notFound();

  return (
    <>
      <Link href="/admin/quizzes" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-brand-700">
        <ArrowLeft size={16} /> All quizzes
      </Link>
      <PageHeader title={quiz.title} description={`/dashboard/quizzes/${quiz.slug}`} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <CardTitle>Quiz settings</CardTitle>
            <div className="mt-4">
              <QuizMetaForm quiz={quiz} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <QuestionsEditor quizId={quiz.id} questions={quiz.questions} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
