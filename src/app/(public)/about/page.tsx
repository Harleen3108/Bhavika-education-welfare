import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { Card, CardBody } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { getAboutContent } from "@/server/services/content.service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Bhavika Education & Welfare Foundation — our story, purpose, objectives and the areas where we work to empower communities.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const about = await getAboutContent();
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]}
      />
      <PageHero
        eyebrow="Who we are"
        eyebrowHi="हम कौन हैं"
        title={about.heading}
        titleHi="हमारी कहानी"
        description={about.intro}
      />

      <Section>
        <Container className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <div className="space-y-5">
            <SectionHeading align="left" title="Our story" />
            {about.story.map((p, i) => (
              <p key={i} className="leading-relaxed text-ink-600">
                {p}
              </p>
            ))}
          </div>
          <div>
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold text-ink-900">Our objectives</h3>
                <ul className="mt-4 space-y-3">
                  {about.objectives.map((o, i) => (
                    <li key={i} className="flex gap-3 text-ink-700">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-accent-600" size={20} />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </Container>
      </Section>

      <Section className="bg-ink-50/70">
        <Container>
          <SectionHeading
            eyebrow="What we do"
            title="Our areas of work"
            description="Focused programs that address education, welfare, livelihood and community."
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {about.areas.map((a) => (
              <Card key={a.title} interactive>
                <CardBody>
                  <h3 className="text-lg font-semibold text-ink-900">{a.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-600">{a.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
          <div className="mt-10 text-center">
            <ButtonLink href="/register" size="lg">
              Join our mission
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
