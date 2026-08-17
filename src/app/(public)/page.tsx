import Image from "next/image";
import Link from "next/link";
import {
  GraduationCap,
  HeartHandshake,
  Users,
  Trophy,
  Gift,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { TestimonialCard, PartnerCard } from "@/components/public/Cards";
import { SITE } from "@/lib/constants";
import {
  getGallery,
  getTestimonials,
  getPartners,
  getAboutContent,
} from "@/server/services/content.service";

// ISR: rendered from CMS data, revalidated every 5 minutes. Falls back to
// defaults (and empty previews) when the DB is unavailable, so it always builds.
export const revalidate = 300;

const stats = [
  { label: "Students supported", value: "2,500+", icon: GraduationCap },
  { label: "Welfare drives", value: "120+", icon: HeartHandshake },
  { label: "Active volunteers", value: "300+", icon: Users },
  { label: "Communities reached", value: "45+", icon: Sparkles },
];

const pillars = [
  {
    icon: BookOpen,
    title: "Education",
    body: "Scholarships, learning centres and digital literacy so every child can learn, regardless of means.",
  },
  {
    icon: HeartHandshake,
    title: "Welfare & Care",
    body: "Health camps, relief drives and support for families when they need it most.",
  },
  {
    icon: Users,
    title: "Community",
    body: "Volunteering, awareness programs and local partnerships that lift entire neighbourhoods.",
  },
];

const engage = [
  {
    icon: Trophy,
    tone: "brand" as const,
    title: "Learn through Quizzes",
    body: "Take daily and weekly quizzes, test your knowledge and climb the leaderboard.",
  },
  {
    icon: Gift,
    tone: "accent" as const,
    title: "Refer & Grow Together",
    body: "Invite friends with your unique link. When they join and participate, you both help the cause.",
  },
  {
    icon: Sparkles,
    tone: "brand" as const,
    title: "Earn Engagement Points",
    body: "Collect points from quizzes, referrals and activities in one secure wallet.",
  },
];

export default async function HomePage() {
  const [galleryPreview, testimonialsPreview, partnersPreview, about] = await Promise.all([
    getGallery().then((g) => g.slice(0, 8)),
    getTestimonials(3),
    getPartners().then((p) => p.slice(0, 6)),
    getAboutContent(),
  ]);

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-background pb-14 sm:pb-20">
        {/* Dark backdrop that ends in a wide curve; image overlaps its edge */}
        <div
          className="relative pt-8 pb-28 text-center sm:pt-10 sm:pb-36 lg:pb-44"
          style={{
            backgroundColor: "var(--color-night-800)",
            borderBottomLeftRadius: "50% 26%",
            borderBottomRightRadius: "50% 26%",
          }}
        >
          <Container>
            <div className="animate-fade-up mx-auto max-w-4xl">
              <h1 className="type-h1 text-white!">
                Empowering communities
                <br /> through knowledge &amp; care.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:mt-7 sm:text-lg lg:text-xl">
                {SITE.shortName} works hand in hand with communities — delivering education,
                welfare and opportunity where it&apos;s needed most. Join us, learn, and grow
                together.
              </p>
            </div>
          </Container>
        </div>

        {/* Large rounded hero image — pulled up to overlap the curved edge */}
        <Container className="relative">
          <div className="animate-fade-up mx-auto -mt-24 max-w-5xl sm:-mt-28 lg:-mt-32">
            <div className="overflow-hidden rounded-3xl bg-night-900 shadow-2xl shadow-night-950/40 ring-1 ring-white/10">
              <div className="relative aspect-video">
                <Image
                  src="/heroo.jpg"
                  alt={`${SITE.name} community`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------------- About band ---------------- */}
      <Section className="pt-4 sm:pt-6">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-night-800 px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
            {/* Decorative star — contained inside the card with rounded corners */}
            <Image
              src="/star.png"
              alt=""
              aria-hidden
              width={520}
              height={520}
              className="pointer-events-none absolute right-6 top-1/2 hidden w-[clamp(14rem,26vw,22rem)] -translate-y-1/2 select-none rounded-3xl object-contain opacity-95 lg:right-10 lg:block"
            />

            <div className="relative max-w-2xl">
              <Badge tone="accent" className="mb-6 bg-accent-400/90 text-night-900 ring-0">
                About {SITE.shortName}
              </Badge>
              <h2 className="type-h2 text-white!">
                Knowledge and care, offered together, can transform lives.
              </h2>
              <p className="type-body-lg mt-6 text-white/80">
                {about.intro}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/about" variant="onDark" size="lg">
                  Learn more
                </ButtonLink>
                <ButtonLink href="/register" variant="cta" size="lg">
                  Join us
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ---------------- Impact stats ---------------- */}
      <Section className="py-12 sm:py-14">
        <Container>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="text-center">
                <CardBody className="py-7">
                  <s.icon className="mx-auto mb-3 text-accent-600" size={30} />
                  <div className="font-display text-2xl font-bold text-brand-800 sm:text-3xl">
                    {s.value}
                  </div>
                  <div className="mt-1 text-sm text-ink-500">{s.label}</div>
                </CardBody>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ---------------- What we do (pillars) ---------------- */}
      <Section className="bg-ink-50/70">
        <Container>
          <SectionHeading
            eyebrow="What we do"
            title="Three pillars, one mission"
            description="Every program we run ladders up to a single goal: helping people build brighter, more dignified futures."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {pillars.map((p) => (
              <Card key={p.title} interactive>
                <CardBody>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <p.icon size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-brand-800">{p.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-600">{p.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ---------------- Engagement platform ---------------- */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Get involved"
            title="Engage, learn and earn — the right way"
            description="Our platform turns support into participation. Learn through quizzes, invite others, and track your positive impact."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {engage.map((e) => (
              <Card key={e.title} interactive>
                <CardBody>
                  <Badge tone={e.tone} className="mb-4">
                    <e.icon size={13} /> {e.title}
                  </Badge>
                  <p className="leading-relaxed text-ink-600">{e.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-ink-500">
            Points reflect your engagement and learning. Eligible benefits will be available
            through our upcoming partner platform — securely and transparently.
          </p>
        </Container>
      </Section>

      {/* ---------------- Gallery preview ---------------- */}
      {galleryPreview.length > 0 && (
        <Section className="bg-ink-50/70">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                align="left"
                eyebrow="In pictures"
                title="Moments from our work"
              />
              <Link
                href="/gallery"
                className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                View gallery →
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {galleryPreview.map((g) => (
                <div key={g.id} className="relative aspect-square overflow-hidden rounded-xl bg-ink-100">
                  <Image
                    src={g.imageUrl}
                    alt={g.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    loading="lazy"
                    className="object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* ---------------- Testimonials preview ---------------- */}
      {testimonialsPreview.length > 0 && (
        <Section>
          <Container>
            <SectionHeading
              eyebrow="Voices of impact"
              title="What our community says"
            />
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonialsPreview.map((t) => (
                <TestimonialCard key={t.id} t={t} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* ---------------- Partners preview ---------------- */}
      {partnersPreview.length > 0 && (
        <Section className={testimonialsPreview.length > 0 ? "bg-ink-50/70 pt-0" : "bg-ink-50/70"}>
          <Container>
            <SectionHeading
              eyebrow="Better together"
              title="Our partners"
              description="Organisations that stand with us to reach more communities."
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {partnersPreview.map((p) => (
                <PartnerCard key={p.id} p={p} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* ---------------- CTA ---------------- */}
      <Section className="pt-0">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-brand-800 px-6 py-14 text-center shadow-lg sm:px-12 lg:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent-500/20 blur-3xl"
            />
            <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              Be part of the change
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">
              Create your free account today. Learn, contribute and help us reach more
              communities — together.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/register" variant="secondary" size="lg">
                Create free account
              </ButtonLink>
              <ButtonLink
                href="/contact"
                size="lg"
                className="border border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                Contact us
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
