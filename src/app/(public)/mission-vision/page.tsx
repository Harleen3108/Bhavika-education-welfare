import type { Metadata } from "next";
import { Target, Eye } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { Card, CardBody } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { getMissionVision } from "@/server/services/content.service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Mission & Vision",
  description:
    "Our mission, vision and core values — the principles that guide Bhavika Education & Welfare Foundation's work in education and community welfare.",
  alternates: { canonical: "/mission-vision" },
};

export default async function MissionVisionPage() {
  const { mission, vision, values } = await getMissionVision();
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Mission & Vision", path: "/mission-vision" },
        ]}
      />
      <PageHero
        eyebrow="Purpose & direction"
        eyebrowHi="उद्देश्य और दिशा"
        title="Mission & Vision"
        titleHi="लक्ष्य और दृष्टि"
        description="Everything we do is anchored to a clear purpose and a hopeful vision for the communities we serve."
        descriptionHi="हमारा हर कदम एक स्पष्ट उद्देश्य से जुड़ा है।"
      />

      <Section>
        <Container className="grid gap-6 lg:grid-cols-2">
          <Card className="border-t-4 border-t-brand-600">
            <CardBody className="p-7 sm:p-9">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Target size={24} />
              </div>
              <h2 className="text-2xl font-bold text-ink-900">Our Mission</h2>
              <p className="mt-3 text-lg leading-relaxed text-ink-700">{mission}</p>
            </CardBody>
          </Card>
          <Card className="border-t-4 border-t-accent-500">
            <CardBody className="p-7 sm:p-9">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
                <Eye size={24} />
              </div>
              <h2 className="text-2xl font-bold text-ink-900">Our Vision</h2>
              <p className="mt-3 text-lg leading-relaxed text-ink-700">{vision}</p>
            </CardBody>
          </Card>
        </Container>
      </Section>

      <Section className="bg-ink-50/70 pt-0">
        <Container>
          <SectionHeading
            eyebrow="What we stand for"
            title="Our core values"
            description="The values that shape our decisions, our programs and our relationships."
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v) => (
              <Card key={v.title} interactive>
                <CardBody>
                  <h3 className="text-lg font-semibold text-ink-900">{v.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-600">{v.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
