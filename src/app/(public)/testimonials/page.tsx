import type { Metadata } from "next";
import { MessageSquareQuote } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { Hi } from "@/components/ui/Bilingual";
import { TestimonialCard } from "@/components/public/Cards";
import { StaggerGroup } from "@/components/motion";
import { getTestimonials } from "@/server/services/content.service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Testimonials",
  description:
    "Voices from the people and communities touched by Bhavika Education & Welfare Foundation's work.",
  alternates: { canonical: "/testimonials" },
};

export default async function TestimonialsPage() {
  const testimonials = await getTestimonials();
  return (
    <>
      <PageHero
        eyebrow="Testimonials"
        eyebrowHi="लोगों की राय"
        title="What families tell us"
        titleHi="परिवार क्या कहते हैं"
        description="Parents, students, teachers and trainees — in their own words, and in the language they said it in."
        descriptionHi="जिनके साथ हम काम करते हैं, उनकी अपनी ज़ुबानी।"
      />
      <Section>
        <Container>
          {testimonials.length === 0 ? (
            <EmptyState
              icon={<MessageSquareQuote size={40} />}
              title="No testimonials yet"
              description="Stories from our community will appear here soon."
            />
          ) : (
            <>
              {/*
                Wrapped flex rather than a grid: the number of stories is
                whatever the admin has approved, and a grid leaves a hole in the
                last row at 5, 7 or 8 entries. A centred wrap closes short rows
                instead. Explicit widths (rather than flex-grow) keep every card
                the same width on every row, and the row's own stretch keeps
                them the same height despite very different message lengths.
              */}
              <StaggerGroup
                as="ul"
                className="flex flex-wrap justify-center gap-6"
                stagger={0.08}
                y={18}
              >
                {testimonials.map((t) => (
                  <li
                    key={t.id}
                    className="w-full md:w-[calc((100%_-_1.5rem)/2)] lg:w-[calc((100%_-_3rem)/3)]"
                  >
                    <TestimonialCard t={t} />
                  </li>
                ))}
              </StaggerGroup>

              <div className="mt-14 flex flex-col items-center gap-4 text-center">
                <p className="type-body text-ink-600">
                  Has a Bhavika programme changed something at your home?
                  <Hi inline className="ml-1.5 text-brand-700">
                    अपनी बात हम तक ज़रूर पहुँचाइए।
                  </Hi>
                </p>
                <ButtonLink href="/contact" variant="outline">
                  Share your story
                </ButtonLink>
              </div>
            </>
          )}
        </Container>
      </Section>
    </>
  );
}
