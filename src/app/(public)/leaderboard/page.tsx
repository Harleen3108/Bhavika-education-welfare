import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { BiHeading, Hi } from "@/components/ui/Bilingual";
import { EmptyState } from "@/components/ui/States";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";
import { getSessionUser } from "@/server/auth/session";
import { getLeaderboard } from "@/server/services/leaderboard.service";
import { LeaderboardPeriod } from "@/lib/enums";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Live daily, weekly and monthly rankings for the Bhavika Foundation quiz. Every period resets, so every student gets a fresh chance at the top.",
};

// Reads live rankings, so it must not be statically cached.
export const dynamic = "force-dynamic";

const TABS = [
  { label: "Daily", hi: "रोज़", value: LeaderboardPeriod.DAILY },
  { label: "Weekly", hi: "साप्ताहिक", value: LeaderboardPeriod.WEEKLY },
  { label: "Monthly", hi: "मासिक", value: LeaderboardPeriod.MONTHLY },
  { label: "All-time", hi: "सर्वकालिक", value: LeaderboardPeriod.ALL_TIME },
] as const;

const VALID = new Set<string>(TABS.map((t) => t.value));

export default async function PublicLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period =
    sp.period && VALID.has(sp.period)
      ? (sp.period as LeaderboardPeriod)
      : LeaderboardPeriod.WEEKLY;

  // Public page: a visitor may or may not be signed in. When they are, the
  // service highlights their row and returns their own rank.
  const session = await getSessionUser();
  const board = await getLeaderboard(period, session?.id, 25);
  const meInRows = board.rows.some((r) => r.isMe);

  return (
    <>
      <section className="bg-warm-glow">
        <Container className="py-14 sm:py-18">
          <BiHeading
            align="left"
            eyebrow="Leaderboard"
            eyebrowHi="लीडरबोर्ड"
            title="Recognition children can see"
            titleHi="हर नाम, हर मेहनत"
            description="Ranked by quiz points. Daily, weekly and monthly boards reset each period (IST), so a slow start never costs a student the whole year."
            className="max-w-3xl"
          />
        </Container>
      </section>

      <Section className="pt-10!">
        <Container>
          {/* Period tabs */}
          <div className="mb-8 flex flex-wrap gap-2">
            {TABS.map((t) => {
              const active = period === t.value;
              return (
                <Link
                  key={t.value}
                  href={`/leaderboard?period=${t.value}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-baseline gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-gradient-cta text-white shadow-sm"
                      : "bg-ink-100 text-ink-700 hover:bg-ink-200",
                  )}
                >
                  {t.label}
                  <Hi inline>{t.hi}</Hi>
                </Link>
              );
            })}
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
            <Card>
              <CardBody>
                {board.rows.length === 0 ? (
                  <EmptyState
                    className="border-0"
                    icon={<Trophy size={36} />}
                    title="No rankings yet this period"
                    description="Be the first to earn points — play today's quiz."
                  />
                ) : (
                  <>
                    <LeaderboardList rows={board.rows} />
                    {board.me?.rank && !meInRows && (
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

            {/* Sidebar CTA */}
            <Card className="bg-gradient-cta border-0 text-white lg:sticky lg:top-24">
              <CardBody>
                <Trophy aria-hidden size={28} />
                <h2 className="mt-4 text-xl text-white!">
                  {session ? "Climb the board" : "Get your name up here"}
                </h2>
                <Hi className="mt-1 block text-white/85">
                  {session ? "आज ही खेलो" : "आज ही शुरू करो"}
                </Hi>
                <p className="mt-3 text-sm leading-relaxed text-white/85">
                  {session
                    ? "Every quiz you finish adds points to this period's total. Play today's quiz to move up."
                    : "Sign up free, play the daily quiz, and earn points that convert into real discounts for your family."}
                </p>
                <ButtonLink
                  href={session ? "/dashboard/quizzes" : "/register"}
                  className="mt-6 w-full bg-white text-brand-700 hover:bg-white/90"
                >
                  {session ? "Play today's quiz" : "Join free"} <ArrowRight size={17} />
                </ButtonLink>
              </CardBody>
            </Card>
          </div>

          <p className="mt-6 text-center text-sm text-ink-500">
            Rankings are based on quiz points only.
            <Hi className="mt-1 block">रैंकिंग केवल क्विज़ पॉइंट्स पर आधारित है।</Hi>
          </p>
        </Container>
      </Section>
    </>
  );
}
