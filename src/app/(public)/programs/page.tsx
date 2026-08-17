import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { BiHeading, Hi } from "@/components/ui/Bilingual";
import { icon } from "@/components/home/icon-map";
import { PROGRAMS, IMPACT } from "@/lib/site-content";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Programs",
  description:
    "Six year-round programmes from Bhavika Foundation: education support, women empowerment, skill development, career guidance, health camps and environment awareness.",
};

export default function ProgramsPage() {
  return (
    <>
      <section className="bg-warm-glow">
        <Container className="py-14 sm:py-20">
          <BiHeading
            align="left"
            eyebrow="What we do"
            eyebrowHi="हमारा कार्य"
            title="Six ways we show up for the community"
            titleHi="समुदाय के लिए हमारा कार्य"
            description="Every programme runs year-round, not as a one-day photo opportunity. Each one is staffed by a local team and measured by outcomes we publish."
            className="max-w-3xl"
          />
        </Container>
      </section>

      <Section>
        <Container>
          <div className="grid gap-6 lg:grid-cols-2">
            {PROGRAMS.map((p, i) => {
              const Icon = icon(p.icon);
              return (
                <Card key={p.key} interactive className="relative overflow-hidden">
                  <span
                    aria-hidden
                    className="font-display absolute right-5 top-4 text-5xl font-bold text-ink-100"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <CardBody className="relative flex h-full flex-col p-6! sm:p-8!">
                    <span className="bg-gradient-cta mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white">
                      <Icon size={26} />
                    </span>
                    <h2 className="type-h3">{p.title}</h2>
                    <Hi className="mt-1 block text-lg font-semibold text-brand-700">
                      {p.titleHi}
                    </Hi>
                    <p className="type-body-lg mt-4 flex-1 text-ink-600">{p.body}</p>
                    <p className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-accent-50 px-4 py-2 text-sm font-semibold text-accent-700">
                      {p.stat}
                      <Hi inline className="text-accent-600">
                        {p.statHi}
                      </Hi>
                    </p>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section className="bg-night-900 py-14! text-white sm:py-16!">
        <Container>
          <BiHeading
            tone="light"
            eyebrow="Our impact"
            eyebrowHi="हमारा प्रभाव"
            title="Numbers that represent real children"
            titleHi="आँकड़ों के पीछे असली चेहरे"
          />
          <dl className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {IMPACT.map((s) => (
              <div key={s.label} className="text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="font-display text-gradient-brand block text-4xl font-bold sm:text-5xl">
                    {s.value}
                  </span>
                  <span className="mt-2 block font-medium text-white/80">{s.label}</span>
                  <Hi className="block text-sm text-white/50">{s.labelHi}</Hi>
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <BiHeading
              title="Want to support a programme?"
              titleHi="किसी कार्यक्रम से जुड़ना चाहते हैं?"
              description={`Volunteer your hours, sponsor a scholarship, or bring your organisation on board as a partner. ${SITE.shortName} runs on people who show up.`}
            />
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/contact" variant="gradient" size="lg">
                Get in touch <ArrowRight size={17} />
              </ButtonLink>
              <ButtonLink href="/register" variant="outline" size="lg">
                Join as a student
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
