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

  const startedRef = React.useRef(false);

  /*
    No synchronous setState here: the first statement awaits, so every state
    update lands in an async continuation rather than in the effect body that
    calls it. The ref guard keeps StrictMode's double-invoked effect (and a
    double tap on Start) from opening two server-side attempts for one quiz.
  */
  const load = React.useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
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

  const start = React.useCallback(() => {
    setPhase("loading");
    void load();
  }, [load]);

  /*
    `load` runs as a microtask callback rather than straight from the effect
    body. Nothing here updates state synchronously — `phase` is already
    "loading" whenever autoStart is set — but react-hooks/set-state-in-effect
    reasons about whether a callee touches state at all, not about when. Handing
    it to .then() puts the work where the rule expects side effects to live.
  */
  React.useEffect(() => {
    if (autoStart) void Promise.resolve().then(load);
  }, [autoStart, load]);

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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <HelpCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-ink-900">{meta.title}</h2>
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
      <div className="sticky top-16 z-20 mb-5 rounded-2xl border border-ink-200 bg-white/95 px-3.5 py-3 shadow-sm backdrop-blur sm:px-4 lg:top-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900 sm:text-base">
              {data.quizTitle}
            </p>
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
              <p className="font-medium break-words text-ink-800">
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
                        // items-start + min-h-11: an option wraps to several
                        // lines at 360px, and every option is a primary tap
                        // target so none may fall under the 44px minimum.
                        "flex min-h-11 w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors sm:px-4",
                        selected
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-ink-200 hover:border-brand-300 hover:bg-ink-50",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                          selected ? "border-brand-500 bg-brand-500 text-white" : "border-ink-300 text-transparent",
                        )}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="min-w-0 flex-1 break-words">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/*
        Submit stays reachable without scrolling to the end of a long quiz.
        The bottom pad clears the gesture bar on phones that report a safe-area
        inset, and falls back to the plain 1rem everywhere else.
      */}
      <div className="sticky bottom-0 mt-6 border-t border-ink-100 bg-background/90 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur">
        {answeredCount < data.questions.length && (
          <p className="mb-2 text-center text-sm text-warning">
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
