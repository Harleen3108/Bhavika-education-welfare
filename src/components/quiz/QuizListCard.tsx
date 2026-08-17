import { Clock, HelpCircle, CheckCircle2 } from "lucide-react";
import type { QuizListItem } from "@/server/services/quiz.service";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

export function QuizListCard({ quiz }: { quiz: QuizListItem }) {
  const done = quiz.attemptedThisPeriod;
  const resume = Boolean(quiz.inProgressAttemptId);
  return (
    <Card interactive className="flex h-full flex-col">
      <CardBody className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <Badge tone={quiz.type === "DAILY" ? "brand" : "accent"}>{quiz.type}</Badge>
          {done && <Badge tone="success"><CheckCircle2 size={13} /> Completed</Badge>}
          {resume && !done && <Badge tone="warning">In progress</Badge>}
        </div>
        <h3 className="mt-3 text-lg font-semibold text-brand-800">{quiz.title}</h3>
        {quiz.description && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-600">{quiz.description}</p>
        )}
        <div className="mt-3 flex items-center gap-4 text-sm text-ink-500">
          <span className="flex items-center gap-1"><HelpCircle size={14} /> {quiz.questionCount} Q</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {Math.round(quiz.timeLimitSeconds / 60)} min</span>
        </div>
        <div className="mt-auto pt-4">
          <ButtonLink
            href={`/dashboard/quizzes/${quiz.slug}`}
            className="w-full"
            size="sm"
            variant={done ? "outline" : "primary"}
          >
            {done ? "View result" : resume ? "Resume" : "Start quiz"}
          </ButtonLink>
        </div>
      </CardBody>
    </Card>
  );
}
