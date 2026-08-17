"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/States";
import { QuizTimer } from "@/components/quiz/QuizTimer";
import { QuizResult } from "@/components/quiz/QuizResult";
import type { StartResult, ResultDTO } from "@/server/services/quiz.service";
import { cn } from "@/lib/utils";

type Phase = "intro" | "loading" | "playing" | "submitting" | "result";

export function QuizRunner({
  slug,
  autoStart,
  meta,
}: {
  slug: string;
  autoStart: boolean;
  meta: { title: string; questionCount: number; timeLimitSeconds: number };
}) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>(autoStart ? "loading" : "intro");
  const [data, setData] = React.useState<StartResult | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [result, setResult] = React.useState<ResultDTO | null>(null);
  const submittingRef = React.useRef(false);

  const start = React.useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch(`/api/quizzes/${slug}/start`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Could not start the quiz.");
        router.push("/dashboard/quizzes");
        return;
      }
      setData(json as StartResult);
      setPhase("playing");
    } catch {
      toast.error("Network error. Please try again.");
      router.push("/dashboard/quizzes");
    }
  }, [slug, router]);

  React.useEffect(() => {
    if (autoStart) start();
  }, [autoStart, start]);

  const submit = React.useCallback(async () => {
    if (!data || submittingRef.current) return;
    submittingRef.current = true;
    setPhase("submitting");
    try {
      const payload = {
        answers: data.questions.map((q) => ({
          questionId: q.id,
          selectedIndex: answers[q.id] ?? null,
        })),
      };
      const res = await fetch(`/api/quizzes/attempts/${data.attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Could not submit the quiz.");
        submittingRef.current = false;
        setPhase("playing");
        return;
      }
      setResult(json as ResultDTO);
      setPhase("result");
      router.refresh();
    } catch {
      toast.error("Network error while submitting. Retrying is safe.");
      submittingRef.current = false;
      setPhase("playing");
    }
  }, [data, answers, router]);

  // ---- Render ----
  if (phase === "result" && result) {
    return <QuizResult result={result} />;
  }

  if (phase === "intro") {
    return (
      <Card className="mx-auto max-w-lg">
        <CardBody className="text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <HelpCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-brand-800">{meta.title}</h2>
          <div className="mt-4 flex justify-center gap-4 text-sm text-ink-600">
            <span>{meta.questionCount} questions</span>
            <span className="flex items-center gap-1">
              <Clock size={14} /> {Math.round(meta.timeLimitSeconds / 60)} min
            </span>
          </div>
          <p className="mt-4 text-sm text-ink-500">
            The timer starts as soon as you begin and runs on our server — it keeps going even if
            you refresh. Make sure you&apos;re ready!
          </p>
          <Button size="lg" className="mt-6 w-full" onClick={start}>
            Start quiz
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (phase === "loading" || !data) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Sticky status bar */}
      <div className="sticky top-16 z-20 mb-5 rounded-2xl border border-ink-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:top-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-brand-800">{data.quizTitle}</p>
            <p className="text-xs text-ink-500">
              {answeredCount}/{data.questions.length} answered
            </p>
          </div>
          <QuizTimer
            expiresAt={data.expiresAt}
            serverNow={data.serverNow}
            onExpire={() => {
              toast.message("Time's up — submitting your answers.");
              submit();
            }}
          />
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-accent-500 transition-all"
            style={{ width: `${(answeredCount / data.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {data.questions.map((q, i) => (
          <Card key={q.id}>
            <CardBody>
              <p className="font-medium text-ink-800">
                <span className="text-ink-400">{i + 1}.</span> {q.text}
              </p>
              <div className="mt-4 grid gap-2.5">
                {q.options.map((opt, idx) => {
                  const selected = answers[q.id] === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                        selected
                          ? "border-brand-500 bg-brand-50 text-brand-800"
                          : "border-ink-200 hover:border-brand-300 hover:bg-ink-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                          selected ? "border-brand-500 bg-brand-500 text-white" : "border-ink-300 text-transparent",
                        )}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-0 mt-6 border-t border-ink-100 bg-[--color-background]/90 py-4 backdrop-blur">
        {answeredCount < data.questions.length && (
          <p className="mb-2 text-center text-sm text-[--color-warning]">
            {data.questions.length - answeredCount} question(s) unanswered.
          </p>
        )}
        <Button
          size="lg"
          className="w-full"
          loading={phase === "submitting"}
          onClick={submit}
        >
          Submit quiz
        </Button>
      </div>
    </div>
  );
}
