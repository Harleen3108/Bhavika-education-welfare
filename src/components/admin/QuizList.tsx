"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal, ConfirmButton } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { QuizMetaForm } from "@/components/admin/QuizMetaForm";
import { setQuizStatus, deleteQuiz } from "@/server/actions/quiz";
import { QuizStatus } from "@/lib/enums";
import { formatDate } from "@/lib/utils";

type QuizRow = {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  questionCount: number;
  startAt: string;
  endAt: string;
  attempts: number;
};

function statusTone(s: string) {
  return s === QuizStatus.ACTIVE ? "success" : s === QuizStatus.DRAFT ? "warning" : "neutral";
}

export function QuizList({ quizzes }: { quizzes: QuizRow[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const cycleStatus = async (q: QuizRow) => {
    const next =
      q.status === QuizStatus.ACTIVE ? QuizStatus.ARCHIVED :
      q.status === QuizStatus.DRAFT ? QuizStatus.ACTIVE : QuizStatus.DRAFT;
    const res = await setQuizStatus(q.id, next);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Quiz ${next.toLowerCase()}.`);
    router.refresh();
  };

  const remove = async (id: string) => {
    const res = await deleteQuiz(id);
    if (!res.ok) return toast.error(res.error);
    toast.success("Quiz deleted.");
    router.refresh();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}><Plus size={16} /> New quiz</Button>
      </div>

      {quizzes.length === 0 ? (
        <EmptyState title="No quizzes yet" description="Create your first daily or weekly quiz." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-ink-500">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Qs</th>
                  <th className="px-4 py-3 font-medium">Window</th>
                  <th className="px-4 py-3 font-medium">Attempts</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {quizzes.map((q) => (
                  <tr key={q.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-3 font-medium text-ink-800">{q.title}</td>
                    <td className="px-4 py-3"><Badge tone={q.type === "DAILY" ? "brand" : "accent"}>{q.type}</Badge></td>
                    <td className="px-4 py-3 text-ink-600">{q.questionCount}</td>
                    <td className="px-4 py-3 text-xs text-ink-500">{formatDate(q.startAt)} – {formatDate(q.endAt)}</td>
                    <td className="px-4 py-3 text-ink-600">{q.attempts}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => cycleStatus(q)} title="Click to change status">
                        <Badge tone={statusTone(q.status)}>{q.status}</Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/quizzes/${q.id}`} className="rounded-lg p-2 text-ink-500 hover:bg-brand-50 hover:text-brand-700" aria-label="Edit"><Pencil size={16} /></Link>
                        <ConfirmButton onConfirm={() => remove(q.id)} className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-[--color-danger]"><Trash2 size={16} /></ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New quiz" size="lg">
        <QuizMetaForm onCreated={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
