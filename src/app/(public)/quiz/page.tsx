import type { Metadata } from "next";
import { ArrowRight, Timer, ShieldCheck, RefreshCw, Trophy, Languages, Smartphone } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { BiHeading, Hi } from "@/components/ui/Bilingual";
import { HeroQuizCard } from "@/components/home/HeroQuizCard";
import { icon } from "@/components/home/icon-map";
import { JOURNEY, LEADERBOARD_PREVIEW } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Daily & Weekly Quiz",
  description:
    "Play the free daily and weekly quiz from Bhavika Foundation. Timed questions in English and Hindi, instant scoring, points in your wallet and a spot on the leaderboard.",
};

/** How the quiz actually behaves — these mirror the server-side rules. */
const RULES = [
  {
    icon: Timer,
    title: "Timed, and the server keeps the clock",
    titleHi: "समय सर्वर तय करता है",
    body: "Each quiz has its own time limit. The countdown you see is display-only — start time and expiry are recorded server-side, so a refresh or a lost connection can't buy extra time.",
  },
  {
    icon: RefreshCw,
    title: "Daily and weekly, on a schedule",
    titleHi: "रोज़ और साप्ताहिक",
    body: "A fresh daily quiz plus a longer weekly one. Attempts are capped per quiz, so everyone competes on the same terms.",
  },
  {
    icon: ShieldCheck,
    title: "Scored on the server, never in the browser",
    titleHi: "स्कोर सर्वर पर",
    body: "Correct answers are never sent to your device before you submit. Scoring, point awards and leaderboard updates all happen server-side and are written to a permanent ledger.",
  },
  {
    icon: Languages,
    title: "Questions in English and Hindi",
    titleHi: "दोनों भाषाओं में",
    body: "Every question is available in both languages, so a child is tested on what they know — not on which language they read faster.",
  },
  {
    icon: Trophy,
    title: "Points land in your wallet instantly",
    titleHi: "पॉइंट्स तुरंत वॉलेट में",
    body: "Your score converts to points the moment you submit, credited exactly once. No pending states, no manual approval.",
  },
  {
    icon: Smartphone,
    title: "Works on a basic phone",
    titleHi: "साधारण फ़ोन पर भी",
    body: "Built to run on an entry-level Android device over a 3G connection, including on a shared family phone.",
  },
] as const;

export default function QuizPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-warm-glow">
        <Container className="py-14 sm:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <BiHeading
                align="left"
                eyebrow="Daily & weekly quiz"
                eyebrowHi="रोज़ और साप्ताहिक क्विज़"
                title="Ten minutes a day. Points that become real savings."
                titleHi="रोज़ दस मिनट, असली बचत"
                description="Answer a short set of timed questions, see your score immediately, and watch your points build up. Free at every stage — there is no fee to play and never will be."
              />
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/register" variant="gradient" size="lg">
                  Play today&apos;s quiz <ArrowRight size={18} />
                </ButtonLink>
                <ButtonLink href="/leaderboard" variant="outline" size="lg">
                  See the leaderboard
                </ButtonLink>
              </div>
            </div>

            <div>
              <HeroQuizCard />
            </div>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <Section>
        <Container>
          <BiHeading
            eyebrow="How it works"
            eyebrowHi="कैसे काम करता है"
            title="From a question to a discount"
            titleHi="सवाल से छूट तक"
            description="Six steps, and a student controls every one of them."
          />
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {JOURNEY.map((s) => {
              const Icon = icon(s.icon);
              return (
                <li key={s.step}>
                  <Card interactive className="h-full">
                    <CardBody>
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="bg-gradient-cta inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        >
                          {s.step}
                        </span>
                        <Icon aria-hidden size={22} className="text-brand-500" />
                      </div>
                      <h3 className="mt-4 text-lg">{s.title}</h3>
                      <Hi className="mt-0.5 block font-semibold text-brand-700">
                        {s.titleHi}
                      </Hi>
                      <p className="mt-2 leading-relaxed text-ink-600">{s.body}</p>
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ol>
        </Container>
      </Section>

      {/* The rules / fairness */}
      <Section className="bg-ink-50/60">
        <Container>
          <BiHeading
            eyebrow="Fair play"
            eyebrowHi="निष्पक्ष खेल"
            title="How we keep the quiz honest"
            titleHi="क्विज़ कैसे निष्पक्ष रहती है"
            description="Points have real value, so the rules that protect them are worth stating plainly."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {RULES.map((r) => (
              <Card key={r.title} interactive>
                <CardBody>
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <r.icon size={20} />
                  </span>
                  <h3 className="text-base">{r.title}</h3>
                  <Hi className="mt-0.5 block text-sm font-semibold text-brand-700">
                    {r.titleHi}
                  </Hi>
                  <p className="mt-3 text-sm leading-relaxed text-ink-600">{r.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* Leaderboard teaser */}
      <Section>
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <BiHeading
                align="left"
                eyebrow="Leaderboard"
                eyebrowHi="लीडरबोर्ड"
                title="Your name, where everyone can see it"
                titleHi="हर नाम, हर मेहनत"
                description="Rankings reset daily, weekly and monthly. A slow start in January doesn't cost a child the whole year."
              />
              <ButtonLink href="/leaderboard" variant="gradient" className="mt-8">
                View full leaderboard <ArrowRight size={17} />
              </ButtonLink>
            </div>

            <Card className="overflow-hidden">
              <ul className="divide-y divide-ink-100">
                {LEADERBOARD_PREVIEW.map((r, i) => {
                  const medal = ["🥇", "🥈", "🥉"][r.rank - 1];
                  return (
                    <li key={i} className="flex items-center gap-4 px-5 py-3.5">
                      <span
                        aria-hidden
                        className={
                          medal
                            ? "w-7 shrink-0 text-center text-lg"
                            : "w-7 shrink-0 text-center text-sm font-bold text-ink-400"
                        }
                      >
                        {medal ?? r.rank}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink-900">
                          {r.name}
                        </span>
                        <span className="block text-xs text-ink-500">{r.meta}</span>
                      </span>
                      <span className="font-display font-bold text-ink-900">
                        {r.points}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </Container>
      </Section>
    </>
  );
}
