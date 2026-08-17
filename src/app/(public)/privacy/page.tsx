import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} collects, uses and protects your personal information.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero title="Privacy Policy" description="Last updated: August 2026" />
      <Section>
        <Container className="prose-brand mx-auto max-w-3xl space-y-4 text-ink-700">
          <p>
            {SITE.name} (&ldquo;we&rdquo;) respects your privacy. This policy explains what
            information we collect, why we collect it, and how we protect it.
          </p>
          <h2 className="text-xl font-semibold text-brand-800">Information we collect</h2>
          <p>
            When you register or contact us, we collect your name, email and any details you
            provide. Passwords are stored only as secure one-way hashes. We record engagement
            activity (quizzes, referrals, points) to operate the platform.
          </p>
          <h2 className="text-xl font-semibold text-brand-800">How we use it</h2>
          <p>
            To provide and improve our services, respond to enquiries, and communicate about
            programs. We do not sell your personal data.
          </p>
          <h2 className="text-xl font-semibold text-brand-800">Your rights</h2>
          <p>
            You may request access to, correction of, or deletion of your data by contacting us
            at <a className="text-brand-600 underline" href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>.
          </p>
        </Container>
      </Section>
    </>
  );
}
