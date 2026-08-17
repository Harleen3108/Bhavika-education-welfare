"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Textarea, Label } from "@/components/ui/Field";
import { Modal, ConfirmButton } from "@/components/ui/Modal";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { EmptyState } from "@/components/ui/States";
import { saveQuestion, deleteQuestion } from "@/server/actions/quiz";
import { cn } from "@/lib/utils";

type Q = {
  id: string;
  text: string;
  imageUrl: string;
  options: string[];
  correctIndex: number;
  points: number;
  order: number;
};

const blank = { id: "", text: "", imageUrl: "", options: ["", ""], correctIndex: 0, points: 10, order: 0 };

export function QuestionsEditor({ quizId, questions }: { quizId: string; questions: Q[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Q>(blank);
  const [saving, setSaving] = React.useState(false);

  const openNew = () => {
    setDraft({ ...blank, order: questions.length + 1 });
    setOpen(true);
  };
  const openEdit = (q: Q) => {
    setDraft({ ...q });
    setOpen(true);
  };

  const setOption = (i: number, val: string) =>
    setDraft((d) => ({ ...d, options: d.options.map((o, idx) => (idx === i ? val : o)) }));
  const addOption = () => setDraft((d) => ({ ...d, options: [...d.options, ""] }));
  const removeOption = (i: number) =>
    setDraft((d) => {
      const options = d.options.filter((_, idx) => idx !== i);
      const correctIndex = d.correctIndex >= options.length ? 0 : d.correctIndex;
      return { ...d, options, correctIndex };
    });

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        text: draft.text,
        imageUrl: draft.imageUrl,
        options: draft.options.map((o) => o.trim()).filter(Boolean),
        correctIndex: draft.correctIndex,
        points: draft.points,
        order: draft.order,
      };
      const res = await saveQuestion(quizId, payload, draft.id || undefined);
      if (!res.ok) return toast.error(res.error);
      toast.success("Question saved.");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const res = await deleteQuestion(quizId, id);
    if (!res.ok) return toast.error(res.error);
    toast.success("Question deleted.");
    router.refresh();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-800">Questions ({questions.length})</h2>
        <Button size="sm" onClick={openNew}><Plus size={16} /> Add question</Button>
      </div>

      {questions.length === 0 ? (
        <EmptyState title="No questions yet" description="Add questions so users can take this quiz." />
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <Card key={q.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-ink-800"><span className="text-ink-400">{i + 1}.</span> {q.text}</p>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => openEdit(q)} className="rounded-lg p-2 text-ink-500 hover:bg-brand-50 hover:text-brand-700" aria-label="Edit"><Pencil size={16} /></button>
                    <ConfirmButton onConfirm={() => remove(q.id)} className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-[--color-danger]"><Trash2 size={16} /></ConfirmButton>
                  </div>
                </div>
                <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  {q.options.map((o, idx) => (
                    <li key={idx} className={cn("flex items-center gap-1.5", idx === q.correctIndex ? "font-medium text-[--color-success]" : "text-ink-600")}>
                      {idx === q.correctIndex ? <CheckCircle2 size={14} /> : <Circle size={14} className="text-ink-300" />}
                      {o}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-400">{q.points} points</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={draft.id ? "Edit question" : "Add question"} size="lg">
        <div className="space-y-4">
          <div>
            <Label required>Question</Label>
            <Textarea value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
          </div>

          <div>
            <Label required>Options (select the correct one)</Label>
            <div className="space-y-2">
              {draft.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, correctIndex: i })}
                    className={cn("shrink-0 rounded-full p-1", draft.correctIndex === i ? "text-[--color-success]" : "text-ink-300")}
                    aria-label="Mark correct"
                  >
                    {draft.correctIndex === i ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                  </button>
                  <Input value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                  {draft.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)} className="shrink-0 rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-[--color-danger]" aria-label="Remove option">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {draft.options.length < 6 && (
              <button type="button" onClick={addOption} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                <Plus size={14} /> Add option
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Points</Label>
              <Input type="number" min={0} value={draft.points} onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Order</Label>
              <Input type="number" min={0} value={draft.order} onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })} />
            </div>
          </div>

          <ImageUploader label="Question image (optional)" value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="subtle" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={save} loading={saving}>Save question</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
