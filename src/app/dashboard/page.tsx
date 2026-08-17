import type { Metadata } from "next";
import Link from "next/link";
import {
  Wallet as WalletIcon,
  Trophy,
  Gift,
  Sparkles,
  Clock,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { getDashboardData } from "@/server/services/dashboard.service";
import { AccountStatus } from "@/lib/enums";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, Alert } from "@/components/ui/States";
import { TransactionList } from "@/components/wallet/TransactionList";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";
import type { DashboardData } from "@/server/services/dashboard.service";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSessionUser();
  const data = await getDashboardData(session!.id);
  const firstName = session!.name.split(" ")[0];

  return (
    <>
      <PageHeader title={`Welcome back, ${firstName}!`} description="Here's your engagement at a glance." />

      {session!.status === AccountStatus.PENDING && (
        <Alert tone="warning" className="mb-6">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>
              Your email isn&apos;t verified yet. Please verify it to activate quizzes and start
              earning points. Check your inbox for the verification link.
            </span>
          </div>
        </Alert>
      )}

      {/* Points snapshot */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total points" value={data.wallet.total} icon={<WalletIcon size={22} />} tone="brand" />
        <StatCard label="Quiz points" value={data.wallet.quiz} icon={<Trophy size={22} />} tone="accent" />
        <StatCard label="Referral points" value={data.wallet.referral} icon={<Gift size={22} />} tone="brand" />
        <StatCard label="Activity points" value={data.wallet.activity} icon={<Sparkles size={22} />} tone="neutral" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Available quizzes */}
          <Card>
            <CardBody>
              <div className="mb-4 flex items-center justify-between">
                <CardTitle>Available quizzes</CardTitle>
                <Link href="/dashboard/quizzes" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                  View all →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <QuizCard quiz={data.availableQuizzes.daily} kind="Daily" />
                <QuizCard quiz={data.availableQuizzes.weekly} kind="Weekly" />
              </div>
            </CardBody>
          </Card>

          {/* Recent transactions */}
          <Card>
            <CardBody>
              <div className="mb-2 flex items-center justify-between">
                <CardTitle>Recent activity</CardTitle>
                <Link href="/dashboard/wallet" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                  Wallet →
                </Link>
              </div>
              {data.recentTransactions.length === 0 ? (
                <EmptyState
                  className="border-0 py-8"
                  icon={<WalletIcon size={32} />}
                  title="No points yet"
                  description="Take a quiz or invite a friend to start earning."
                />
              ) : (
                <TransactionList transactions={data.recentTransactions} />
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Referral summary */}
          <Card>
            <CardBody>
              <CardTitle>Your referrals</CardTitle>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Mini label="Total" value={data.referrals.total} />
                <Mini label="Pending" value={data.referrals.pending} />
                <Mini label="Rewarded" value={data.referrals.rewarded} />
              </div>
              <div className="mt-4 rounded-xl bg-ink-50 p-3">
                <p className="text-xs text-ink-500">Your referral code</p>
                <p className="font-mono text-lg font-bold tracking-wider text-brand-700">
                  {data.referrals.code || "—"}
                </p>
              </div>
              <ButtonLink href="/dashboard/referrals" variant="outline" className="mt-4 w-full" size="sm">
                Invite friends <ArrowRight size={16} />
              </ButtonLink>
            </CardBody>
          </Card>

          {/* Leaderboard preview */}
          <Card>
            <CardBody>
              <div className="mb-3 flex items-center justify-between">
                <CardTitle>Top learners</CardTitle>
                <Link href="/dashboard/leaderboard" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                  Full board →
                </Link>
              </div>
              {data.leaderboard.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-500">
                  Be the first on the leaderboard — take a quiz!
                </p>
              ) : (
                <LeaderboardList rows={data.leaderboard} />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-ink-50 py-3">
      <p className="font-display text-xl font-bold text-brand-800">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

function QuizCard({
  quiz,
  kind,
}: {
  quiz: DashboardData["availableQuizzes"]["daily"];
  kind: string;
}) {
  if (!quiz) {
    return (
      <div className="flex flex-col justify-center rounded-xl border border-dashed border-ink-300 p-4 text-center">
        <Badge tone="neutral" className="mx-auto mb-2">{kind}</Badge>
        <p className="text-sm text-ink-500">No {kind.toLowerCase()} quiz available right now.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col rounded-xl border border-ink-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <Badge tone={kind === "Daily" ? "brand" : "accent"}>{kind}</Badge>
        {quiz.attemptedThisPeriod && <Badge tone="success">Completed</Badge>}
      </div>
      <p className="mt-2 line-clamp-1 font-semibold text-brand-800">{quiz.title}</p>
      <div className="mt-1 flex items-center gap-3 text-xs text-ink-500">
        <span>{quiz.questionCount} questions</span>
        <span className="flex items-center gap-1">
          <Clock size={12} /> {Math.round(quiz.timeLimitSeconds / 60)} min
        </span>
      </div>
      <ButtonLink
        href={`/dashboard/quizzes/${quiz.slug}`}
        size="sm"
        variant={quiz.attemptedThisPeriod ? "outline" : "primary"}
        className="mt-3"
      >
        {quiz.attemptedThisPeriod ? "View result" : "Start quiz"}
      </ButtonLink>
    </div>
  );
}
