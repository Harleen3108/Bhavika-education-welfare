import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The terms governing your use of the ${SITE.name} platform.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PageHero title="Terms of Use" description="Last updated: August 2026" />
      <Section>
        <Container className="mx-auto max-w-3xl space-y-4 text-ink-700">
          <p>
            By using the {SITE.name} platform you agree to these terms. Please read them
            carefully.
          </p>
          <h2 className="text-xl font-semibold text-ink-900">Accounts</h2>
          <p>
            You are responsible for keeping your account credentials secure. Accounts that
            violate our rules or attempt to abuse the points, quiz or referral systems may be
            suspended or blocked.
          </p>
          <h2 className="text-xl font-semibold text-ink-900">Engagement points</h2>
          <p>
            Points reflect participation and learning. They carry no cash value and are not
            redeemable for money in Phase 1. Eligible benefits, when available, will be governed
            by additional terms.
          </p>
          <h2 className="text-xl font-semibold text-ink-900">Fair use</h2>
          <p>
            Automated abuse, self-referral, multiple accounts and other manipulation are
            prohibited and may result in forfeiture of points and account restrictions.
          </p>
        </Container>
      </Section>
    </>
  );
}
