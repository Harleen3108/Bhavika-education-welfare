import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Play,
  Quote,
  Trophy,
  Store,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Clock,
  Heart,
} from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { BiHeading, Hi } from "@/components/ui/Bilingual";
import { TestimonialCard, PartnerChip } from "@/components/public/Cards";
import { HeroQuizCard } from "@/components/home/HeroQuizCard";
import { icon } from "@/components/home/icon-map";
import { CountUp, Parallax, Reveal, StaggerGroup, TiltCard } from "@/components/motion";
import { SITE } from "@/lib/constants";
import {
  GAP,
  JOURNEY,
  WALLETS,
  EARNED_HERE,
  SPENT_THERE,
  REWARD_CHAIN,
  LEADERBOARD_PREVIEW,
} from "@/lib/site-content";
import { HERO_IMAGES, PROGRAM_IMAGES, type CuratedImage } from "@/lib/images";
import {
  getGallery,
  getTestimonials,
  getPartners,
} from "@/server/services/content.service";
import { getHomePageData } from "@/server/services/site-data.service";
import { getLeaderboard } from "@/server/services/leaderboard.service";
import { LeaderboardPeriod } from "@/lib/enums";
import { Avatar } from "@/components/ui/Avatar";

// ISR: everything on this page is read through services that fall back to the
// compiled marketing copy, revalidated every 5 minutes. The page renders in
// full against an empty — or unreachable — database.
export const revalidate = 300;

const HERO_PHOTO = HERO_IMAGES[0];
const FOUNDER_PHOTO = HERO_IMAGES[2];

/**
 * Programme art, looked up by the programme's key. Widened to a string index
 * because the programme list is editable from /admin/content: a key an editor
 * invents has no photograph, and the card falls back to its icon.
 */
const PROGRAM_ART: Record<string, CuratedImage | undefined> = PROGRAM_IMAGES;

const enIN = new Intl.NumberFormat("en-IN");

/**
 * Split a display figure like "10,000+" or "₹ 890" into the pieces CountUp
 * needs. Returns null when the string is not a whole number with affixes — an
 * admin can write anything into an impact figure, and free text must still
 * print exactly as it was typed rather than be mangled into a counter.
 *
 * CountUp re-groups the digits in en-IN, matching how the service formats live
 * counts, so a figure typed with Western grouping is normalised to the site's.
 */
function splitStat(value: string): { prefix: string; to: number; suffix: string } | null {
  const match = /^(\D*)(\d[\d,]*)(.*)$/.exec(value.trim());
  if (!match) return null;
  // A fractional tail would be dropped by the whole-number counter, so a value
  // like "1.5L" is left as written instead of counting to a different figure.
  if (/^\.\d/.test(match[3])) return null;
  const to = Number(match[2].replace(/,/g, ""));
  if (!Number.isInteger(to)) return null;
  return { prefix: match[1], to, suffix: match[3] };
}

/**
 * An impact or wallet figure that counts up on first view, degrading to the
 * plain string whenever the value is not numeric. Either way the final,
 * truthful number is what ships in the HTML.
 */
function StatValue({ value, className }: { value: string; className?: string }) {
  const parts = splitStat(value);
  if (!parts) return <span className={className}>{value}</span>;
  return (
    <CountUp
      className={className}
      to={parts.to}
      prefix={parts.prefix}
      suffix={parts.suffix}
    />
  );
}

export default async function HomePage() {
  const [home, galleryPreview, testimonialsPreview, partners, board] = await Promise.all([
    getHomePageData(),
    getGallery().then((g) => g.slice(0, 8)),
    // Six, not four: the voices arrive in three registers — English, Hinglish
    // and Devanagari — and a four-card preview cut the Hindi one off the
    // homepage entirely, which is the half of the audience the Hindi is for.
    getTestimonials(6),
    getPartners(),
    // Real weekly rankings for the preview card. Never throws — an unreachable
    // database returns an empty board and the card falls back to the sample.
    getLeaderboard(LeaderboardPeriod.WEEKLY, undefined, 5).catch(() => null),
  ]);

  const { impact, programs, pillars, faqs, founder, counts } = home;

  /*
    The preview shows real rankings the moment anyone has scored this week, and
    the illustrative sample before that — a brand-new site with an empty board
    would otherwise present as a dead product on its own homepage.

    `boardIsLive` gates the "Live" badge: labelling the sample as live would be
    a straightforward lie to a visitor.
  */
  const boardIsLive = Boolean(board && board.rows.length > 0);
  const leaderRows = boardIsLive
    ? board!.rows.map((r) => ({
        rank: r.rank,
        name: r.name,
        points: r.points,
        avatarUrl: r.avatarUrl || undefined,
        meta: undefined as string | undefined,
        delta: undefined as string | undefined,
      }))
    : LEADERBOARD_PREVIEW.map((r) => ({
        rank: r.rank,
        name: r.name,
        points: r.points,
        avatarUrl: undefined as string | undefined,
        meta: r.meta as string | undefined,
        delta: r.delta as string | undefined,
      }));

  // Secondary platform numbers, shown only once they are real. A brand-new
  // deployment must not advertise "0 quizzes played".
  const activity = counts.isLive
    ? [
        { n: counts.data.quizzes, en: "quizzes published", hi: "क्विज़ प्रकाशित" },
        { n: counts.data.quizAttempts, en: "quizzes played", hi: "क्विज़ खेली गईं" },
        { n: counts.data.gallery, en: "photos from the field", hi: "मैदान की तस्वीरें" },
        { n: counts.data.testimonials, en: "voices shared", hi: "अनुभव साझा" },
      ].filter((a) => a.n > 0)
    : [];

  const founderPhoto = founder.data.imageUrl
    ? {
        url: founder.data.imageUrl,
        alt: founder.data.name
          ? `${founder.data.name}, ${founder.data.role}`
          : `Portrait of the ${founder.data.role.toLowerCase()}`,
      }
    : { url: FOUNDER_PHOTO.url, alt: FOUNDER_PHOTO.alt };

  return (
    <>
      {/* ═══════════════════════════════════ Hero ═══════════════════════════ */}
      <section className="bg-warm-glow relative overflow-hidden">
        {/* Decorative depth layer. Leads the scroll (negative speed) so it
            separates from the photograph rather than moving with it. */}
        <Parallax
          aria-hidden
          speed={-0.22}
          className="pointer-events-none absolute -top-24 -right-32 hidden lg:block"
        >
          <span className="block h-80 w-80 rounded-full bg-brand-200/40 blur-3xl" />
        </Parallax>

        <Container className="relative py-12 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            {/* ---- Copy ---- */}
            {/* Above the fold, so this stays on the CSS entrance rather than a
                GSAP Reveal — no chance of a re-animation flash on first paint. */}
            <div className="animate-fade-up">
              <span className="inline-flex flex-wrap items-center gap-2 rounded-full border border-brand-200 bg-surface/80 px-4 py-2 text-sm font-medium text-ink-700 shadow-sm">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full bg-brand-500"
                />
                Registered Non-Profit · Education for every child
                <Hi inline>शिक्षा हर बच्चे का अधिकार</Hi>
              </span>

              <h1 className="type-h1 mt-6">
                Empowering students through{" "}
                <span className="text-gradient-brand">education, knowledge</span> &amp;
                rewards
              </h1>
              <Hi className="mt-3 block text-xl font-semibold text-brand-700 sm:text-2xl">
                शिक्षा · ज्ञान · सम्मान
              </Hi>

              <p className="type-body-lg mt-6 max-w-xl text-ink-600">
                {SITE.shortName} turns everyday learning into something children actually
                look forward to. Play daily quizzes, climb the leaderboard, earn reward
                points — and redeem them as real discounts for your family.
              </p>
              <Hi className="mt-3 block max-w-xl text-ink-600">
                रोज़ क्विज़ खेलो, पॉइंट्स कमाओ, और परिवार के लिए असली बचत पाओ।
              </Hi>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/register" variant="gradient" size="lg">
                  Start earning — play quiz <ArrowRight size={18} />
                </ButtonLink>
                <ButtonLink href="/about" variant="outline" size="lg">
                  <Play size={17} /> Our mission
                </ButtonLink>
              </div>

              {/* Inline proof strip */}
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-ink-200 pt-6">
                {impact.data.slice(0, 3).map((s) => (
                  <div key={s.key}>
                    <dt className="sr-only">{s.label}</dt>
                    <dd>
                      <StatValue
                        value={s.value}
                        className="font-display block text-2xl font-bold text-ink-900"
                      />
                      <span className="mt-0.5 block text-xs text-ink-500">{s.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* ---- Visual: photo + floating proof + live quiz card ---- */}
            <div className="animate-fade-up relative">
              <div className="relative overflow-hidden rounded-3xl shadow-card-hover">
                <div className="relative aspect-4/3">
                  {/* The photo is oversized top and bottom so the parallax
                      drift can never expose an edge inside the frame. */}
                  <Parallax speed={0.18} className="absolute inset-x-0 -inset-y-8">
                    <Image
                      src={HERO_PHOTO.url}
                      alt={HERO_PHOTO.alt}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 520px"
                      className="object-cover"
                    />
                  </Parallax>
                </div>

                {/* Reward coupon chip — states the payoff on the photo itself */}
                <div className="absolute top-4 left-4 flex items-center gap-3 rounded-2xl bg-night-900/85 px-4 py-3 text-white backdrop-blur-sm">
                  <span
                    aria-hidden
                    className="bg-gradient-cta inline-flex h-9 w-9 items-center justify-center rounded-xl"
                  >
                    <Store size={17} />
                  </span>
                  <span className="leading-tight">
                    <span className="type-label block text-white/60">Reward coupon</span>
                    <span className="text-sm font-semibold">₹500 off at Jai Maa Durga</span>
                  </span>
                </div>

                <span className="bg-gradient-cta absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold text-white shadow-lg">
                  <Trophy size={15} /> +50 pts
                </span>
              </div>

              {/* Playable question, overlapping the photo */}
              <div className="relative z-10 -mt-10 px-3 sm:px-6 lg:-mt-14 lg:px-4">
                <HeroQuizCard />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ══════════════════════════ Mission / Vision / Values ═══════════════ */}
      <Section>
        <Container>
          <Reveal>
            <BiHeading
              eyebrow="Who we are"
              eyebrowHi="हम कौन हैं"
              title="Education is the one gift that multiplies"
              titleHi="शिक्षा ही सबसे बड़ा उपहार है"
              description="Bhavika Education & Welfare Foundation works with children and families in small towns and villages, where talent is everywhere but opportunity is not. We build the encouragement, tools and recognition that keep a child learning."
            />
          </Reveal>

          <StaggerGroup className="mt-12 grid gap-6 md:grid-cols-3" stagger={0.12}>
            {pillars.data.map((p) => {
              const Icon = icon(p.icon);
              return (
                <Card key={p.title} interactive className="relative overflow-hidden">
                  <Icon
                    aria-hidden
                    size={120}
                    strokeWidth={1}
                    className="pointer-events-none absolute -top-6 -right-6 text-brand-100"
                  />
                  <CardBody className="relative">
                    <span className="bg-gradient-cta mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white">
                      <Icon size={22} />
                    </span>
                    <h3 className="text-xl">{p.title}</h3>
                    <Hi className="mt-0.5 block font-semibold text-brand-700">
                      {p.titleHi}
                    </Hi>
                    <p className="mt-3 leading-relaxed text-ink-600">{p.body}</p>
                  </CardBody>
                </Card>
              );
            })}
          </StaggerGroup>
        </Container>
      </Section>

      {/* ═════════════════════════════ Founder's message ════════════════════ */}
      <Section className="pt-0">
        <Container>
          <Reveal>
            <Card className="overflow-hidden">
              <CardBody className="grid gap-8 p-6! sm:p-10! lg:grid-cols-[200px_1fr] lg:gap-10">
                <div className="relative mx-auto aspect-square w-40 shrink-0 overflow-hidden rounded-2xl lg:mx-0 lg:w-full">
                  <Image
                    src={founderPhoto.url}
                    alt={founderPhoto.alt}
                    fill
                    sizes="(max-width: 1024px) 160px, 200px"
                    loading="lazy"
                    className="object-cover"
                  />
                </div>

                <div>
                  <span className="inline-flex flex-wrap items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5">
                    <span className="type-label text-brand-700">
                      Founder&apos;s message
                    </span>
                    <Hi inline className="text-brand-700">
                      संस्थापक का संदेश
                    </Hi>
                  </span>

                  <Quote aria-hidden size={34} className="mt-5 text-brand-200" />
                  <blockquote className="mt-2 text-lg leading-relaxed font-medium text-ink-800 sm:text-xl">
                    {founder.data.quote}
                  </blockquote>
                  <Hi className="mt-4 block text-brand-700">{founder.data.quoteHi}</Hi>

                  <div className="mt-7 border-l-3 border-brand-500 pl-4">
                    {/* The name is optional in the stored block; without one the
                        role carries the byline, exactly as the seeded copy does. */}
                    {founder.data.name ? (
                      <>
                        <p className="font-semibold text-ink-900">{founder.data.name}</p>
                        <p className="text-sm text-ink-600">{founder.data.role}</p>
                      </>
                    ) : (
                      <p className="font-semibold text-ink-900">{founder.data.role}</p>
                    )}
                    <p className="text-sm text-ink-500">
                      {SITE.name} <Hi inline>{founder.data.roleHi}</Hi>
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Reveal>
        </Container>
      </Section>

      {/* ════════════════════════════════ Programs ══════════════════════════ */}
      <Section className="bg-ink-50/60">
        <Container>
          <Reveal>
            <BiHeading
              eyebrow="What we do"
              eyebrowHi="हमारा कार्य"
              title="Six ways we show up for the community"
              titleHi="समुदाय के लिए हमारा कार्य"
              description="Every program runs year-round, not as a one-day photo opportunity."
            />
          </Reveal>

          {/* The stagger targets the <li>, the tilt lives on a nested wrapper —
              two GSAP effects on one element would fight over its transform. */}
          <StaggerGroup
            as="ul"
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            stagger={0.08}
          >
            {programs.data.map((p) => {
              const Icon = icon(p.icon);
              const art = PROGRAM_ART[p.key];
              return (
                <li key={p.key} className="h-full">
                  <TiltCard max={6} glare className="h-full rounded-2xl">
                    <Card
                      interactive
                      className="group flex h-full flex-col overflow-hidden"
                    >
                      {art && (
                        <div className="relative aspect-16/9 shrink-0 overflow-hidden bg-ink-100">
                          <Image
                            src={art.url}
                            alt={art.alt}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                            loading="lazy"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <span
                            aria-hidden
                            className="absolute inset-0 bg-linear-to-t from-night-950/45 to-transparent"
                          />
                          <span
                            aria-hidden
                            className="absolute bottom-3 left-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-brand-700 shadow-sm"
                          >
                            <Icon size={20} />
                          </span>
                        </div>
                      )}
                      <CardBody className="flex flex-1 flex-col">
                        {!art && (
                          <span
                            aria-hidden
                            className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"
                          >
                            <Icon size={22} />
                          </span>
                        )}
                        <h3 className="text-lg">{p.title}</h3>
                        <Hi className="mt-0.5 block font-semibold text-brand-700">
                          {p.titleHi}
                        </Hi>
                        <p className="mt-3 flex-1 leading-relaxed text-ink-600">{p.body}</p>
                        <p className="mt-5 border-t border-ink-200 pt-4 text-sm font-semibold text-accent-700">
                          {p.stat}{" "}
                          <Hi inline className="text-ink-500">
                            {p.statHi}
                          </Hi>
                        </p>
                      </CardBody>
                    </Card>
                  </TiltCard>
                </li>
              );
            })}
          </StaggerGroup>

          <div className="mt-10 text-center">
            {/* Button is `whitespace-nowrap`, so this 354px label set the page's
                min-content and overflowed a 360px phone. It wraps below sm and
                keeps the single-line pill from sm up, where it fits. */}
            <ButtonLink
              href="/programs"
              variant="outline"
              size="lg"
              className="h-auto max-w-full py-3.5 whitespace-normal sm:h-13 sm:py-0 sm:whitespace-nowrap"
            >
              Explore all programmes in detail <ArrowRight size={17} className="shrink-0" />
            </ButtonLink>
          </div>
        </Container>
      </Section>

      {/* ══════════════════════ The gap: problem → solution ═════════════════ */}
      <Section>
        <Container>
          <Reveal>
            <BiHeading
              eyebrow="Why this platform exists"
              eyebrowHi="यह मंच क्यों"
              title="The gap we set out to close"
              titleHi="जिस कमी को हम भर रहे हैं"
            />
          </Reveal>

          <div className="mt-12 grid gap-x-6 gap-y-4 lg:grid-cols-[1fr_auto_1fr]">
            {/* Column headers — desktop only */}
            <p className="hidden items-center justify-center gap-2 text-center lg:flex">
              <AlertTriangle aria-hidden size={16} className="text-rose-glow-500" />
              <span className="type-label text-rose-glow-600">The problem</span>
              <Hi inline className="text-ink-500">
                समस्या
              </Hi>
            </p>
            <div aria-hidden className="hidden lg:block" />
            <p className="hidden items-center justify-center gap-2 text-center lg:flex">
              <Lightbulb aria-hidden size={16} className="text-accent-600" />
              <span className="type-label text-accent-700">Our solution</span>
              <Hi inline className="text-ink-500">
                समाधान
              </Hi>
            </p>

            {GAP.map((g, i) => (
              <React.Fragment key={g.problem}>
                {/* The solution follows the problem in, not with it — the small
                    delay is the argument of the section, made in motion. */}
                <Reveal className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6">
                  <h3 className="text-lg">{g.problem}</h3>
                  <Hi className="mt-0.5 block font-semibold text-rose-glow-600">
                    {g.problemHi}
                  </Hi>
                  <p className="mt-3 leading-relaxed text-ink-600">{g.problemBody}</p>
                </Reveal>

                <div
                  aria-hidden
                  className="flex items-center justify-center py-1 lg:py-0"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-surface text-brand-500">
                    <ArrowRight size={16} className="rotate-90 lg:rotate-0" />
                  </span>
                </div>

                <Reveal
                  delay={0.15}
                  className="relative overflow-hidden rounded-2xl border border-accent-200 bg-accent-50/70 p-6"
                >
                  <span
                    aria-hidden
                    className="font-display absolute top-2 right-4 text-4xl font-bold text-accent-200"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="relative text-lg">{g.solution}</h3>
                  <Hi className="mt-0.5 block font-semibold text-accent-700">
                    {g.solutionHi}
                  </Hi>
                  <p className="mt-3 leading-relaxed text-ink-600">{g.solutionBody}</p>
                </Reveal>
              </React.Fragment>
            ))}
          </div>
        </Container>
      </Section>

      {/* ═══════════════════ Learn • Compete • Earn (the journey) ═══════════ */}
      <Section className="bg-night-900 text-white">
        <Container>
          <Reveal>
            <BiHeading
              tone="light"
              eyebrow="The platform"
              eyebrowHi="आने वाला मंच"
              title={
                <>
                  Learn <span className="text-brand-400">•</span> Compete{" "}
                  <span className="text-brand-400">•</span> Earn
                </>
              }
              titleHi="सीखो • जीतो • कमाओ"
              description="One connected journey — from a child answering a question, to a family saving money at the checkout counter."
            />
          </Reveal>

          <StaggerGroup
            as="ol"
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            stagger={0.07}
          >
            {JOURNEY.map((s) => {
              const Icon = icon(s.icon);
              return (
                <li
                  key={s.step}
                  className="relative rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-brand-400/50 hover:bg-white/10"
                >
                  <span
                    aria-hidden
                    className="bg-gradient-cta absolute -top-4 left-6 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg"
                  >
                    {s.step}
                  </span>
                  <Icon aria-hidden size={24} className="mt-2 text-brand-400" />
                  <h3 className="mt-4 text-lg text-white!">{s.title}</h3>
                  <Hi className="mt-0.5 block font-medium text-brand-300">{s.titleHi}</Hi>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{s.body}</p>
                </li>
              );
            })}
          </StaggerGroup>
        </Container>
      </Section>

      {/* ═══════════════════════════ Leaderboard preview ════════════════════ */}
      <Section>
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <BiHeading
                align="left"
                eyebrow="Leaderboard"
                eyebrowHi="लीडरबोर्ड"
                title="Recognition children can see"
                titleHi="हर नाम, हर मेहनत"
                description="A live ranking board that resets daily, weekly and monthly — so every child gets a fresh chance at the top, not just the same five names all year."
              />
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/leaderboard" variant="gradient">
                  View full leaderboard <ArrowRight size={17} />
                </ButtonLink>
                <ButtonLink href="/register" variant="outline">
                  Play to climb
                </ButtonLink>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-5 py-4">
                  <div>
                    <p className="font-semibold text-ink-900">Top performers</p>
                    <Hi className="block text-sm text-ink-500">शीर्ष प्रतिभागी</Hi>
                  </div>
                  {boardIsLive ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500"
                      />
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600">
                      Sample
                    </span>
                  )}
                </div>

                <ul className="divide-y divide-ink-100">
                  {leaderRows.map((r) => {
                    const medal = ["🥇", "🥈", "🥉"][r.rank - 1];
                    return (
                      <li
                        key={r.rank}
                        className="flex items-center gap-3 px-5 py-3.5 sm:gap-4"
                      >
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
                        {boardIsLive && (
                          <Avatar src={r.avatarUrl} name={r.name} size={32} />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-ink-900">
                            {r.name}
                          </span>
                          {r.meta && (
                            <span className="block text-xs text-ink-500">{r.meta}</span>
                          )}
                        </span>
                        <span className="text-right">
                          <span className="font-display block font-bold text-ink-900">
                            {r.points}
                          </span>
                          {r.delta && (
                            <span className="block text-xs font-semibold text-accent-600">
                              {r.delta}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {!boardIsLive && (
                  <p className="border-t border-ink-100 px-5 py-3 text-xs text-ink-500">
                    An example board — real names appear here as soon as students
                    start playing.
                    <Hi className="mt-0.5 block">
                      यह एक उदाहरण है — खेल शुरू होते ही असली नाम यहाँ दिखेंगे।
                    </Hi>
                  </p>
                )}
              </Card>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* ═════════════════════════════ Wallet system ════════════════════════ */}
      <Section className="bg-ink-50/60">
        <Container>
          <Reveal>
            <BiHeading
              eyebrow="Wallet system"
              eyebrowHi="वॉलेट सिस्टम"
              title="Every point tracked, separately"
              titleHi="हर पॉइंट का हिसाब"
              description="Four independent balances keep earnings transparent — a child and a parent can always see exactly where a point came from."
            />
          </Reveal>

          <StaggerGroup
            as="ul"
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            stagger={0.08}
          >
            {WALLETS.map((w) => {
              const Icon = icon(w.icon);
              return (
                <li key={w.key} className="h-full">
                  <TiltCard max={5} className="h-full rounded-2xl">
                    <Card interactive className="h-full">
                      <CardBody>
                        <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                          <Icon size={20} />
                        </span>
                        <h3 className="text-base">{w.title}</h3>
                        <Hi className="mt-0.5 block text-sm font-medium text-brand-700">
                          {w.titleHi}
                        </Hi>
                        <StatValue
                          value={w.value}
                          className="font-display mt-4 block text-3xl font-bold text-ink-900"
                        />
                        <p className="mt-3 text-sm leading-relaxed text-ink-600">
                          {w.body}
                        </p>
                      </CardBody>
                    </Card>
                  </TiltCard>
                </li>
              );
            })}
          </StaggerGroup>

          <p className="mx-auto mt-8 max-w-2xl rounded-2xl border border-brand-200 bg-brand-50/60 px-6 py-4 text-center text-sm text-ink-700">
            At 5,000 points, a student can convert their balance into redeemable reward
            value.
            <Hi className="mt-1 block text-ink-600">
              5,000 पॉइंट्स पर पॉइंट्स को इनाम में बदला जा सकता है।
            </Hi>
          </p>
        </Container>
      </Section>

      {/* ═════════════════ NGO × E-commerce — the Jai Maa Durga loop ════════ */}
      <Section>
        <Container>
          <Reveal>
            <BiHeading
              eyebrow="NGO × E-commerce"
              eyebrowHi="दो-तरफ़ा जुड़ाव"
              title="Learn today. Save tomorrow."
              titleHi="आज सीखो, कल बचाओ"
              description="The two platforms form one loop. Bhavika Foundation rewards learning; the Jai Maa Durga store honours those rewards as real money off real purchases."
            />
          </Reveal>

          <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
            {/* Earned here */}
            <Reveal className="h-full">
              <Card className="h-full border-brand-200 bg-brand-50/40">
                <CardBody>
                  <p className="type-label text-brand-700">Where value is earned</p>
                  <Hi className="mt-1 block text-sm text-ink-500">जहाँ कमाई होती है</Hi>
                  <h3 className="mt-4 text-xl">{SITE.shortName}</h3>
                  <Hi className="mt-0.5 block font-semibold text-brand-700">
                    भाविका फाउंडेशन
                  </Hi>
                  <ul className="mt-5 flex flex-col gap-3">
                    {EARNED_HERE.map((f) => (
                      <li key={f.en} className="flex items-start gap-2.5">
                        <Sparkles
                          aria-hidden
                          size={16}
                          className="mt-1 shrink-0 text-brand-500"
                        />
                        <span>
                          <span className="block text-ink-800">{f.en}</span>
                          <Hi className="block text-sm text-ink-500">{f.hi}</Hi>
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </Reveal>

            {/* Connector */}
            <div className="flex flex-row items-center justify-center gap-3 lg:flex-col">
              <span aria-hidden className="h-px w-10 bg-ink-200 lg:h-16 lg:w-px" />
              <span className="bg-gradient-cta inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg">
                <ArrowRight size={20} className="lg:rotate-90" />
              </span>
              <span aria-hidden className="h-px w-10 bg-ink-200 lg:h-16 lg:w-px" />
              <span className="sr-only">Value flows from Bhavika to Jai Maa Durga</span>
            </div>

            {/* Spent there */}
            <Reveal delay={0.15} className="h-full">
              <Card className="h-full border-accent-200 bg-accent-50/40">
                <CardBody>
                  <p className="type-label text-accent-700">Where value is spent</p>
                  <Hi className="mt-1 block text-sm text-ink-500">
                    जहाँ इस्तेमाल होती है
                  </Hi>
                  <h3 className="mt-4 text-xl">Jai Maa Durga</h3>
                  <Hi className="mt-0.5 block font-semibold text-accent-700">
                    जय माँ दुर्गा
                  </Hi>
                  <ul className="mt-5 flex flex-col gap-3">
                    {SPENT_THERE.map((f) => (
                      <li key={f.en} className="flex items-start gap-2.5">
                        <Store
                          aria-hidden
                          size={16}
                          className="mt-1 shrink-0 text-accent-600"
                        />
                        <span>
                          <span className="block text-ink-800">{f.en}</span>
                          <Hi className="block text-sm text-ink-500">{f.hi}</Hi>
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </Reveal>
          </div>

          {/* The full chain */}
          <Reveal className="mt-10 rounded-3xl border border-ink-200 bg-surface p-5 sm:p-6">
            <p className="mb-5 text-center">
              <span className="type-label text-ink-500">The complete reward chain</span>
              <Hi inline className="ml-2 text-ink-500">
                पूरी प्रक्रिया
              </Hi>
            </p>
            <ol className="flex snap-x snap-mandatory items-stretch gap-2 overflow-x-auto pb-2">
              {REWARD_CHAIN.map((c, i) => {
                const Icon = icon(c.icon);
                const last = i === REWARD_CHAIN.length - 1;
                return (
                  <li
                    key={c.en}
                    className="flex shrink-0 snap-start items-center gap-2"
                  >
                    <div className="flex min-w-[8.5rem] items-center gap-2.5 rounded-xl px-2 py-1.5">
                      <span
                        aria-hidden
                        className={
                          last
                            ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500 text-white"
                            : "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"
                        }
                      >
                        <Icon size={17} />
                      </span>
                      <span className="leading-tight">
                        <span className="block text-sm font-semibold text-ink-900">
                          {c.en}
                        </span>
                        <Hi className="block text-xs text-ink-500">{c.hi}</Hi>
                      </span>
                    </div>
                    {!last && (
                      <ArrowRight
                        aria-hidden
                        size={15}
                        className="shrink-0 text-ink-300"
                      />
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="mt-5 flex flex-col gap-3 border-t border-ink-200 pt-5 sm:flex-row sm:justify-center">
              <ButtonLink href="/rewards" variant="gradient">
                How rewards work <ArrowRight size={17} />
              </ButtonLink>
              <ButtonLink href="/register" variant="outline">
                <Store size={16} /> Earn a coupon
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* ══════════════════════════════ Impact stats ════════════════════════ */}
      <Section className="bg-night-900 py-14! text-white sm:py-16!">
        <Container>
          <Reveal>
            <BiHeading
              tone="light"
              eyebrow="Our impact"
              eyebrowHi="हमारा प्रभाव"
              title="Numbers that represent real children"
              titleHi="आँकड़ों के पीछे असली चेहरे"
            />
            {impact.isLive && (
              // Only shown once at least one figure is a real count, so the
              // badge never over-claims on a freshly seeded deployment.
              <p className="mt-6 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/85">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-400"
                  />
                  Counted live from our records
                  <Hi inline className="text-white/60">
                    अभी के आँकड़े
                  </Hi>
                </span>
              </p>
            )}
          </Reveal>

          <StaggerGroup
            as="dl"
            className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4"
            stagger={0.1}
          >
            {impact.data.map((s) => (
              <div key={s.key} className="text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <StatValue
                    value={s.value}
                    className="font-display text-gradient-brand block text-4xl font-bold sm:text-5xl"
                  />
                  <span className="mt-2 block font-medium text-white/80">
                    {s.label}
                    {s.isLive && (
                      <span
                        aria-hidden
                        className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-400 align-middle"
                      />
                    )}
                  </span>
                  <Hi className="block text-sm text-white/50">{s.labelHi}</Hi>
                </dd>
              </div>
            ))}
          </StaggerGroup>

          {activity.length > 0 && (
            <Reveal className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
              {activity.map((a) => (
                <span key={a.en} className="text-sm text-white/70">
                  <span className="font-display font-bold text-white">{enIN.format(a.n)}</span>{" "}
                  {a.en}
                  {/* Same alpha as the English it pairs with. At white/45 this
                      line measured 4.42:1 on night-900 — under AA for ~12px
                      type, and the Hindi half was the only thing faded. */}
                  <Hi inline className="ml-1.5">
                    {a.hi}
                  </Hi>
                </span>
              ))}
            </Reveal>
          )}
        </Container>
      </Section>

      {/* ════════════════════════════════ Gallery ═══════════════════════════ */}
      {galleryPreview.length > 0 && (
        <Section>
          <Container>
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <BiHeading
                align="left"
                eyebrow="Gallery"
                eyebrowHi="गैलरी"
                title="Moments from the ground"
                titleHi="मैदान से कुछ पल"
                description="Classrooms, camps, distribution drives and celebrations."
              />
              <Link
                href="/gallery"
                className="text-sm font-semibold text-brand-700 hover:text-brand-700"
              >
                View the full gallery →
              </Link>
            </Reveal>

            <StaggerGroup
              as="ul"
              className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
              stagger={0.06}
              y={16}
            >
              {galleryPreview.map((g) => (
                <li
                  key={g.id}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-ink-100"
                >
                  <Image
                    src={g.imageUrl}
                    // The stored description leads with a Hindi caption, which
                    // an English-voiced screen reader would mangle; the title is
                    // the written-for-humans line.
                    alt={g.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    loading="lazy"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-night-950/85 to-transparent p-3 pt-8 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {g.title}
                  </span>
                </li>
              ))}
            </StaggerGroup>
          </Container>
        </Section>
      )}

      {/* ══════════════════════════════ Testimonials ════════════════════════ */}
      {testimonialsPreview.length > 0 && (
        <Section className="bg-ink-50/60">
          <Container>
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <BiHeading
                align="left"
                eyebrow="Testimonials"
                eyebrowHi="लोगों की राय"
                title="What families tell us"
                titleHi="परिवार क्या कहते हैं"
                description="Said in English, in Hinglish and in Hindi — printed here in the language it was told to us in."
              />
              <Link
                href="/testimonials"
                className="text-sm font-semibold text-brand-700 hover:text-brand-700"
              >
                Read every story →
              </Link>
            </Reveal>

            {/* Plain <li> wrappers so the stagger and the card's own tilt each
                own a separate element's transform. Wrapped flex rather than a
                grid: the preview is capped at six but returns however many are
                approved, and a centred wrap closes an odd last row instead of
                leaving a hole in it. */}
            <StaggerGroup
              as="ul"
              className="mt-12 flex flex-wrap justify-center gap-6"
              stagger={0.1}
            >
              {testimonialsPreview.map((t) => (
                <li
                  key={t.id}
                  className="w-full md:w-[calc((100%_-_1.5rem)/2)] lg:w-[calc((100%_-_3rem)/3)]"
                >
                  <TestimonialCard t={t} />
                </li>
              ))}
            </StaggerGroup>
          </Container>
        </Section>
      )}

      {/* ═══════════════════════════════ Partners ═══════════════════════════ */}
      {partners.length > 0 && (
        <Section>
          <Container>
            <Reveal>
              <BiHeading
                eyebrow="Partners & references"
                eyebrowHi="सहयोगी संस्थाएँ"
                title="Working alongside"
                titleHi="हमारे सहयोगी"
                description="A reward coupon is only worth something if a shopkeeper honours it, and an evening class only opens if someone lends the hall. These are the people who do that."
              />
            </Reveal>

            {/*
              Replaces a scrolling strip of bare names. A marquee of a handful of
              plain words reads as a rendering fault rather than a network, and
              it hid the only thing that makes the list credible — a mark per
              organisation. A static wall needs no JS to be legible, wraps to any
              count, and stays centred whether an admin leaves two partners
              active or twenty.
            */}
            <div className="mt-12 rounded-3xl border border-ink-200 bg-ink-50/70 p-6 sm:p-10">
              <StaggerGroup
                as="ul"
                className="flex flex-wrap items-stretch justify-center gap-3 sm:gap-4"
                stagger={0.05}
                y={14}
              >
                {partners.map((p, i) => (
                  <li key={p.id} className="flex">
                    {/* The index drives the tile colour, so the wall cycles
                        through the brand ramp in document order. */}
                    <PartnerChip p={p} index={i} />
                  </li>
                ))}
              </StaggerGroup>

              <div className="mt-8 flex flex-col items-center gap-4 border-t border-ink-200 pt-8 text-center">
                <p className="type-small text-ink-600">
                  {enIN.format(partners.length)}{" "}
                  {partners.length === 1 ? "organisation works" : "organisations work"}{" "}
                  alongside us right now.
                  <Hi inline className="ml-1.5 text-brand-700">
                    हर कार्यक्रम इन्हीं के सहयोग से चलता है।
                  </Hi>
                </p>
                <ButtonLink href="/partners" variant="outline" size="sm">
                  Meet every partner
                </ButtonLink>
              </div>
            </div>
          </Container>
        </Section>
      )}

      {/* ══════════════════════════════════ FAQ ═════════════════════════════ */}
      <Section className="pt-0">
        <Container>
          <Reveal>
            <BiHeading
              eyebrow="FAQ"
              eyebrowHi="सामान्य प्रश्न"
              title="Questions we hear often"
              titleHi="अक्सर पूछे जाने वाले प्रश्न"
            />
          </Reveal>

          {/* Native <details> — accessible and keyboard-operable with no JS. */}
          <StaggerGroup
            className="mx-auto mt-12 flex max-w-3xl flex-col gap-3"
            stagger={0.06}
            y={16}
          >
            {faqs.data.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-ink-200 bg-surface px-5 py-1 open:border-brand-300 open:bg-brand-50/30"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 font-semibold text-ink-900 marker:content-none">
                  <span>
                    {f.q}
                    <Hi className="mt-0.5 block font-medium text-brand-700">{f.qHi}</Hi>
                  </span>
                  <ChevronDown
                    aria-hidden
                    size={20}
                    className="mt-0.5 shrink-0 text-brand-500 transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="pb-5">
                  <p className="leading-relaxed text-ink-600">{f.a}</p>
                  {f.aHi && <Hi className="mt-2 block text-ink-500">{f.aHi}</Hi>}
                </div>
              </details>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      {/* ═══════════════════════════════ Get involved ═══════════════════════ */}
      <Section className="pt-0">
        <Container>
          <div className="bg-gradient-cta relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12 lg:py-20">
            <Parallax
              aria-hidden
              speed={0.3}
              className="pointer-events-none absolute -top-20 -right-20"
            >
              <span className="block h-72 w-72 rounded-full bg-white/15 blur-3xl" />
            </Parallax>
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl"
            />

            <Reveal className="relative">
              <span className="type-label inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-white">
                Get involved{" "}
                <Hi inline className="normal-case tracking-normal">
                  हमसे जुड़ें
                </Hi>
              </span>

              <h2 className="type-h2 mt-6 text-white!">
                Every child deserves someone in their corner
              </h2>
              <Hi className="mt-3 block text-lg text-white/85 sm:text-xl">
                हर बच्चे को एक साथी चाहिए
              </Hi>
              <p className="mx-auto mt-5 max-w-xl text-white/85">
                Teach a class, run a camp, sponsor a scholarship, or simply share our work.
                Two hours a month changes a child&apos;s year.
              </p>

              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <ButtonLink
                  href="/register"
                  size="lg"
                  className="bg-white text-brand-700 shadow-lg hover:bg-white/90"
                >
                  Join the mission <ArrowUpRight size={18} />
                </ButtonLink>
                <ButtonLink href="/contact" variant="onDark" size="lg">
                  <Heart size={17} /> Volunteer or partner
                </ButtonLink>
              </div>

              <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-white/80">
                {[
                  { en: "Flexible hours", icon: Clock },
                  { en: "Certificate of service", icon: Trophy },
                  { en: "Local team support", icon: Sparkles },
                ].map((b) => (
                  <li key={b.en} className="inline-flex items-center gap-2">
                    <b.icon aria-hidden size={15} /> {b.en}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </Container>
      </Section>
    </>
  );
}
