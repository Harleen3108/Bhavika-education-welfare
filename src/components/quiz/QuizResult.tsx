import Link from "next/link";
import { CheckCircle2, XCircle, Trophy, Clock } from "lucide-react";
import type { ResultDTO } from "@/server/services/quiz.service";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function QuizResult({ result }: { result: ResultDTO }) {
  const pct =
    result.totalQuestions > 0
      ? Math.round((result.correctCount / result.totalQuestions) * 100)
      : 0;
  const expired = result.status === "EXPIRED";

  return (
    <div className="mx-auto max-w-2xl">
      {/* Summary */}
      <Card className="overflow-hidden">
        <div className="bg-brand-800 px-4 py-7 text-center text-white sm:px-6 sm:py-8">
          <Trophy className="mx-auto text-accent-400" size={40} />
          <h2 className="mt-3 text-lg font-bold break-words text-white sm:text-2xl">
            {result.quizTitle}
          </h2>
          <p className="mt-1 text-white/70">
            {expired ? "Time expired — here's how you did" : "Quiz complete!"}
          </p>
        </div>
        <CardBody>
          <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
            <Stat label="Score" value={`${result.score}`} sub="points" tone="brand" />
            <Stat label="Correct" value={`${result.correctCount}/${result.totalQuestions}`} sub="answers" tone="accent" />
            <Stat label="Accuracy" value={`${pct}%`} sub="" tone="neutral" />
          </div>
          {expired && (
            <div className="mt-4 flex items-center justify-center gap-1.5 text-sm text-warning">
              <Clock size={15} /> Submitted after time ran out.
            </div>
          )}
        </CardBody>
      </Card>

      {/* Review */}
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-semibold text-ink-900">Review answers</h3>
        {result.questions.map((q, i) => (
          <Card key={q.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-medium break-words text-ink-800">
                  <span className="text-ink-400">{i + 1}.</span> {q.text}
                </p>
                {q.isCorrect ? (
                  <Badge tone="success" className="shrink-0"><CheckCircle2 size={13} /> +{q.pointsEarned}</Badge>
                ) : (
                  <Badge tone="danger" className="shrink-0"><XCircle size={13} /> 0</Badge>
                )}
              </div>
              <ul className="mt-3 space-y-2">
                {q.options.map((opt, idx) => {
                  const isCorrect = idx === q.correctIndex;
                  const isSelected = idx === q.selectedIndex;
                  return (
                    /*
                      items-start + wrapping: an option can run several lines at
                      360px, and "Your answer" previously sat on the same flex
                      line where it was squeezed to nothing. It now drops below
                      the option text when there is no room beside it.
                    */
                    <li
                      key={idx}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                        isCorrect && "border-green-300 bg-green-50 text-green-800",
                        !isCorrect && isSelected && "border-red-300 bg-red-50 text-red-800",
                        !isCorrect && !isSelected && "border-ink-200 text-ink-600",
                      )}
                    >
                      {isCorrect ? (
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                      ) : isSelected ? (
                        <XCircle size={16} className="mt-0.5 shrink-0 text-danger" />
                      ) : (
                        <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-ink-300" />
                      )}
                      <span className="min-w-0 flex-1 break-words">
                        {opt}
                        {isSelected && !isCorrect && (
                          <span className="ml-2 text-xs font-medium whitespace-nowrap">
                            (Your answer)
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href="/dashboard/quizzes" variant="outline">All quizzes</ButtonLink>
        <ButtonLink href="/dashboard/leaderboard">View leaderboard</ButtonLink>
      </div>
      <p className="mt-4 text-center text-sm text-ink-500">
        Points have been added to your <Link href="/dashboard/wallet" className="text-brand-700 underline">wallet</Link>.
      </p>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "brand" | "accent" | "neutral" }) {
  const tones = { brand: "text-brand-700", accent: "text-accent-600", neutral: "text-ink-700" };
  return (
    <div className="rounded-xl bg-ink-50 px-1 py-3 sm:py-4">
      <p className={cn("font-display text-xl font-bold tabular-nums sm:text-2xl", tones[tone])}>
        {value}
      </p>
      <p className="text-[0.6875rem] text-ink-500 sm:text-xs">
        {label}
        {sub && ` (${sub})`}
      </p>
    </div>
  );
}
