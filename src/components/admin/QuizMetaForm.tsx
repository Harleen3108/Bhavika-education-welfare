"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, Select, FieldError } from "@/components/ui/Field";
import { saveQuiz } from "@/server/actions/quiz";
import { QuizType, QuizStatus } from "@/lib/enums";

type QuizMeta = {
  id?: string;
  title: string;
  description: string;
  type: string;
  status: string;
  startAt: string; // ISO
  endAt: string; // ISO
  timeLimitSeconds: number;
  maxAttempts: number;
};

function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export function QuizMetaForm({
  quiz,
  onCreated,
}: {
  quiz?: QuizMeta;
  onCreated?: (id: string) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [v, setV] = React.useState({
    title: quiz?.title ?? "",
    description: quiz?.description ?? "",
    type: quiz?.type ?? QuizType.DAILY,
    status: quiz?.status ?? QuizStatus.DRAFT,
    startAt: toLocalInput(quiz?.startAt ?? ""),
    endAt: toLocalInput(quiz?.endAt ?? ""),
    timeLimitMinutes: quiz ? Math.round(quiz.timeLimitSeconds / 60) : 5,
    maxAttempts: quiz?.maxAttempts ?? 1,
  });

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        title: v.title,
        description: v.description,
        type: v.type,
        status: v.status,
        startAt: v.startAt,
        endAt: v.endAt,
        timeLimitSeconds: Math.max(30, Math.round(v.timeLimitMinutes * 60)),
        maxAttempts: v.maxAttempts,
      };
      const res = await saveQuiz(payload, quiz?.id);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success("Quiz saved.");
      const newId = (res.data as { id: string } | undefined)?.id;
      if (!quiz && newId) {
        onCreated?.(newId);
        router.push(`/admin/quizzes/${newId}`);
      } else {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label required>Title</Label>
        <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} aria-invalid={!!errors.title} />
        <FieldError>{errors.title}</FieldError>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Type</Label>
          <Select value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })}>
            <option value={QuizType.DAILY}>Daily</option>
            <option value={QuizType.WEEKLY}>Weekly</option>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}>
            <option value={QuizStatus.DRAFT}>Draft</option>
            <option value={QuizStatus.ACTIVE}>Active</option>
            <option value={QuizStatus.ARCHIVED}>Archived</option>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>Start</Label>
          <Input type="datetime-local" value={v.startAt} onChange={(e) => setV({ ...v, startAt: e.target.value })} aria-invalid={!!errors.startAt} />
          <FieldError>{errors.startAt}</FieldError>
        </div>
        <div>
          <Label required>End</Label>
          <Input type="datetime-local" value={v.endAt} onChange={(e) => setV({ ...v, endAt: e.target.value })} aria-invalid={!!errors.endAt} />
          <FieldError>{errors.endAt}</FieldError>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Time limit (minutes)</Label>
          <Input type="number" min={1} value={v.timeLimitMinutes} onChange={(e) => setV({ ...v, timeLimitMinutes: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Max attempts (per period)</Label>
          <Input type="number" min={1} value={v.maxAttempts} onChange={(e) => setV({ ...v, maxAttempts: Number(e.target.value) })} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>{quiz ? "Save changes" : "Create quiz"}</Button>
      </div>
    </div>
  );
}
