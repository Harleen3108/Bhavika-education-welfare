import type { Metadata } from "next";
import { MessageSquareQuote } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/States";
import { TestimonialCard } from "@/components/public/Cards";
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
        eyebrow="Voices of impact"
        title="Testimonials"
        description="The people we serve and work alongside share what our programs have meant to them."
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <TestimonialCard key={t.id} t={t} />
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
