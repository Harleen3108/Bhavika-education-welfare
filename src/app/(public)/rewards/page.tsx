import type { Metadata } from "next";
import { ArrowRight, Store, Sparkles, ShieldCheck, FileText, Lock } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { BiHeading, Hi } from "@/components/ui/Bilingual";
import { icon } from "@/components/home/icon-map";
import {
  WALLETS,
  EARNED_HERE,
  SPENT_THERE,
  REWARD_CHAIN,
} from "@/lib/site-content";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Rewards & Wallet",
  description:
    "How points work at Bhavika Foundation: four separate wallets, a permanent transaction ledger, and coupons redeemable as real discounts at the Jai Maa Durga store.",
};

/** The guarantees behind the points — this is what makes parents trust it. */
const SAFEGUARDS = [
  {
    icon: FileText,
    title: "Every point is a ledger entry",
    titleHi: "हर पॉइंट दर्ज होता है",
    body: "Points are never a number that quietly changes. Each credit and debit is written as a permanent transaction record with its own ID, date, source and description.",
  },
  {
    icon: ShieldCheck,
    title: "Credited exactly once",
    titleHi: "सिर्फ़ एक बार",
    body: "Every reward carries a unique key, so a double-tap, a retry or a lost connection can never award the same points twice — and never award them zero times either.",
  },
  {
    icon: Lock,
    title: "Points are never simply deleted",
    titleHi: "पॉइंट्स कभी मिटाए नहीं जाते",
    body: "When you transfer to the store, points move only after the store confirms receipt. Until then they stay in your wallet. A failed transfer leaves your balance untouched.",
  },
] as const;

export default function RewardsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-warm-glow">
        <Container className="py-14 sm:py-20">
          <BiHeading
            align="left"
            eyebrow="Rewards & wallet"
            eyebrowHi="इनाम और वॉलेट"
            title="Learn today. Save tomorrow."
            titleHi="आज सीखो, कल बचाओ"
            description={`${SITE.shortName} rewards learning; the Jai Maa Durga store honours those rewards as real money off real purchases. Here is exactly how a point travels from a quiz answer to a discount at the counter.`}
            className="max-w-3xl"
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/register" variant="gradient" size="lg">
              Start earning points <ArrowRight size={18} />
            </ButtonLink>
            <ButtonLink href="/quiz" variant="outline" size="lg">
              How the quiz works
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* The four wallets */}
      <Section>
        <Container>
          <BiHeading
            eyebrow="Wallet system"
            eyebrowHi="वॉलेट सिस्टम"
            title="Every point tracked, separately"
            titleHi="हर पॉइंट का हिसाब"
            description="Four independent balances keep earnings transparent — a child and a parent can always see exactly where a point came from."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WALLETS.map((w) => {
              const Icon = icon(w.icon);
              return (
                <Card key={w.key} interactive>
                  <CardBody>
                    <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Icon size={20} />
                    </span>
                    <h3 className="text-base">{w.title}</h3>
                    <Hi className="mt-0.5 block text-sm font-medium text-brand-700">
                      {w.titleHi}
                    </Hi>
                    <p className="font-display mt-4 text-3xl font-bold text-ink-900">
                      {w.value}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-600">{w.body}</p>
                  </CardBody>
                </Card>
              );
            })}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-ink-500">
            Balances shown are illustrative. Sign in to see your own wallet.
            <Hi className="mt-1 block">यह उदाहरण हैं — अपना वॉलेट देखने के लिए लॉग इन करें।</Hi>
          </p>
        </Container>
      </Section>

      {/* The chain */}
      <Section className="bg-ink-50/60">
        <Container>
          <BiHeading
            eyebrow="The reward chain"
            eyebrowHi="पूरी प्रक्रिया"
            title="From a quiz answer to a discount"
            titleHi="जवाब से छूट तक"
          />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REWARD_CHAIN.map((c, i) => {
              const Icon = icon(c.icon);
              const last = i === REWARD_CHAIN.length - 1;
              return (
                <li key={c.en}>
                  <Card className={last ? "border-accent-300 bg-accent-50/50" : undefined}>
                    <CardBody className="flex items-center gap-4">
                      <span
                        aria-hidden
                        className={
                          last
                            ? "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-500 text-white"
                            : "bg-gradient-cta inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
                        }
                      >
                        <Icon size={20} />
                      </span>
                      <span className="min-w-0">
                        <span className="type-label block text-ink-400">
                          Step {i + 1}
                        </span>
                        <span className="mt-1 block font-semibold text-ink-900">
                          {c.en}
                        </span>
                        <Hi className="block text-sm text-ink-500">{c.hi}</Hi>
                      </span>
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ol>
        </Container>
      </Section>

      {/* Earned here / spent there */}
      <Section>
        <Container>
          <BiHeading
            eyebrow="NGO × E-commerce"
            eyebrowHi="दो-तरफ़ा जुड़ाव"
            title="Two platforms, one loop"
            titleHi="दो मंच, एक चक्र"
            description="Bhavika stays an independent education foundation. Jai Maa Durga stays a separate store. They are connected by a secure, auditable transfer — not by shared accounts."
          />

          <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
            <Card className="border-brand-200 bg-brand-50/40">
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
                      <Sparkles aria-hidden size={16} className="mt-1 shrink-0 text-brand-500" />
                      <span>
                        <span className="block text-ink-800">{f.en}</span>
                        <Hi className="block text-sm text-ink-500">{f.hi}</Hi>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <div className="flex flex-row items-center justify-center gap-3 lg:flex-col">
              <span aria-hidden className="h-px w-10 bg-ink-200 lg:h-16 lg:w-px" />
              <span className="bg-gradient-cta inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg">
                <ArrowRight size={20} className="lg:rotate-90" />
              </span>
              <span aria-hidden className="h-px w-10 bg-ink-200 lg:h-16 lg:w-px" />
              <span className="sr-only">Value flows from Bhavika to Jai Maa Durga</span>
            </div>

            <Card className="border-accent-200 bg-accent-50/40">
              <CardBody>
                <p className="type-label text-accent-700">Where value is spent</p>
                <Hi className="mt-1 block text-sm text-ink-500">जहाँ इस्तेमाल होती है</Hi>
                <h3 className="mt-4 text-xl">Jai Maa Durga</h3>
                <Hi className="mt-0.5 block font-semibold text-accent-700">जय माँ दुर्गा</Hi>
                <ul className="mt-5 flex flex-col gap-3">
                  {SPENT_THERE.map((f) => (
                    <li key={f.en} className="flex items-start gap-2.5">
                      <Store aria-hidden size={16} className="mt-1 shrink-0 text-accent-600" />
                      <span>
                        <span className="block text-ink-800">{f.en}</span>
                        <Hi className="block text-sm text-ink-500">{f.hi}</Hi>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Safeguards */}
      <Section className="bg-night-900 text-white">
        <Container>
          <BiHeading
            tone="light"
            eyebrow="Your points are safe"
            eyebrowHi="आपके पॉइंट्स सुरक्षित हैं"
            title="Three guarantees, built into the system"
            titleHi="तीन पक्की गारंटी"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {SAFEGUARDS.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <span className="bg-gradient-cta mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white">
                  <s.icon size={22} />
                </span>
                <h3 className="text-lg text-white!">{s.title}</h3>
                <Hi className="mt-0.5 block font-medium text-brand-300">{s.titleHi}</Hi>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{s.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
