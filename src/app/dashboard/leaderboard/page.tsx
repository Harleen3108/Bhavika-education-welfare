import type { Metadata } from "next";
import Link from "next/link";
import { Medal, Trophy } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { getLeaderboard } from "@/server/services/leaderboard.service";
import { LeaderboardPeriod } from "@/lib/enums";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";
import { cn, formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { label: "Daily", value: LeaderboardPeriod.DAILY },
  { label: "Weekly", value: LeaderboardPeriod.WEEKLY },
  { label: "Monthly", value: LeaderboardPeriod.MONTHLY },
  { label: "All-time", value: LeaderboardPeriod.ALL_TIME },
] as const;

const VALID = new Set<string>(TABS.map((t) => t.value));

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSessionUser();
  const period =
    sp.period && VALID.has(sp.period)
      ? (sp.period as LeaderboardPeriod)
      : LeaderboardPeriod.WEEKLY;

  const board = await getLeaderboard(period, session!.id);
  const meInRows = board.rows.some((r) => r.isMe);

  return (
    <>
      <PageHeader title="Leaderboard" description="Top learners ranked by quiz points." />

      {/* Period tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = period === t.value;
          return (
            <Link
              key={t.value}
              href={`/dashboard/leaderboard?period=${t.value}`}
              className={cn(
                // min-h-11 clears the 44px touch target on a phone; the desktop
                // pill keeps its original 36px height from sm up.
                "inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors sm:min-h-0",
                active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Your rank */}
      {board.me && (
        <Card className="mb-6 border-brand-200 bg-brand-50">
          <CardBody className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white">
                <Medal size={22} />
              </span>
              <div>
                <p className="text-sm text-ink-600">Your rank</p>
                <p className="font-display text-xl font-bold text-ink-900">
                  {board.me.rank ? `#${board.me.rank}` : "Unranked"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-ink-600">Your points</p>
              <p className="font-display text-xl font-bold text-accent-600">
                {formatPoints(board.me.points)}
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          {board.rows.length === 0 ? (
            <EmptyState
              className="border-0"
              icon={<Trophy size={36} />}
              title="No rankings yet"
              description="Be the first to earn points this period — take a quiz!"
            />
          ) : (
            <>
              <LeaderboardList rows={board.rows} />
              {board.me && board.me.rank && !meInRows && (
                <div className="mt-4 border-t border-dashed border-ink-200 pt-4">
                  <LeaderboardList
                    rows={[
                      {
                        rank: board.me.rank,
                        name: "You",
                        points: board.me.points,
                        isMe: true,
                      },
                    ]}
                  />
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      <p className="mt-4 text-center text-sm text-ink-500">
        Rankings are based on quiz points. Daily and weekly boards reset each period (IST).
      </p>
    </>
  );
}
