"use client";

import { useLinkStatus } from "next/link";
import { Clock, HelpCircle, CheckCircle2 } from "lucide-react";
import type { QuizListItem } from "@/server/services/quiz.service";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

/*
  The quiz page is force-dynamic, so a click can sit for a moment before the
  route commits. `useLinkStatus` acknowledges the press in place while the
  navigation is still in flight — the route-level loading.tsx takes over the
  moment it does. Deliberately no `prefetch={false}`: in production the prefetched
  loading shell makes the transition instant and this label never flashes.
*/
function NavLabel({ idle, pending: pendingLabel }: { idle: string; pending: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return <>{idle}</>;
  return (
    <>
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      {pendingLabel}
      <span role="status" className="sr-only">
        {pendingLabel}
      </span>
    </>
  );
}

export function QuizListCard({ quiz }: { quiz: QuizListItem }) {
  const done = quiz.attemptedThisPeriod;
  const resume = Boolean(quiz.inProgressAttemptId);
  const idle = done ? "View result" : resume ? "Resume" : "Start quiz";
  const pending = done ? "Opening…" : "Starting…";

  return (
    <Card interactive className="flex h-full flex-col">
      <CardBody className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <Badge tone={quiz.type === "DAILY" ? "brand" : "accent"}>{quiz.type}</Badge>
          {done && <Badge tone="success"><CheckCircle2 size={13} /> Completed</Badge>}
          {resume && !done && <Badge tone="warning">In progress</Badge>}
        </div>
        <h3 className="mt-3 text-lg font-semibold text-ink-900">{quiz.title}</h3>
        {quiz.description && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-600">{quiz.description}</p>
        )}
        <div className="mt-3 flex items-center gap-4 text-sm text-ink-500">
          <span className="flex items-center gap-1"><HelpCircle size={14} /> {quiz.questionCount} Q</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {Math.round(quiz.timeLimitSeconds / 60)} min</span>
        </div>
        <div className="mt-auto pt-4">
          {/* w-full keeps the swap to the pending label from shifting the card. */}
          <ButtonLink
            href={`/dashboard/quizzes/${quiz.slug}`}
            className="w-full"
            size="sm"
            variant={done ? "outline" : "primary"}
          >
            <NavLabel idle={idle} pending={pending} />
          </ButtonLink>
        </div>
      </CardBody>
    </Card>
  );
}
