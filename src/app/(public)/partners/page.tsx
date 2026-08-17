import type { Metadata } from "next";
import { Handshake } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/States";
import { PartnerCard } from "@/components/public/Cards";
import { getPartners } from "@/server/services/content.service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Partners & References",
  description:
    "The organisations and partners who support and collaborate with Bhavika Education & Welfare Foundation.",
  alternates: { canonical: "/partners" },
};

export default async function PartnersPage() {
  const partners = await getPartners();
  return (
    <>
      <PageHero
        eyebrow="Better together"
        title="Partners & References"
        description="We are grateful to the organisations and supporters who make our work possible."
      />
      <Section>
        <Container>
          {partners.length === 0 ? (
            <EmptyState
              icon={<Handshake size={40} />}
              title="No partners listed yet"
              description="Our partner network will be showcased here soon."
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {partners.map((p) => (
                <PartnerCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
