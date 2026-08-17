import type { Metadata } from "next";
import { Handshake } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { Hi } from "@/components/ui/Bilingual";
import { PartnerCard } from "@/components/public/Cards";
import { StaggerGroup } from "@/components/motion";
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
        eyebrow="Partners & references"
        eyebrowHi="सहयोगी संस्थाएँ"
        title="Working alongside"
        titleHi="हमारे सहयोगी"
        description="Schools, a district office, a panchayat, health workers, shopkeepers and self-help groups. Each one carries a piece of the work we could not do on our own."
        descriptionHi="इन संस्थाओं के सहयोग से ही हमारा काम ज़मीन पर पहुँचता है।"
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
            <>
              {/*
                Wrapped flex rather than a grid, and centred: an admin may leave
                two partners active or twenty, and a fixed grid strands the last
                row against the left edge at any count that does not divide
                evenly. Fixed widths keep every card identical whatever the
                count is.
              */}
              <StaggerGroup
                as="ul"
                className="flex flex-wrap justify-center gap-6"
                stagger={0.07}
                y={18}
              >
                {partners.map((p, i) => (
                  <li
                    key={p.id}
                    className="w-full sm:w-[calc((100%_-_1.5rem)/2)] lg:w-[calc((100%_-_3rem)/3)]"
                  >
                    {/* The index drives the monogram tile's colour, so the wall
                        cycles through the brand ramp in document order. */}
                    <PartnerCard p={p} index={i} />
                  </li>
                ))}
              </StaggerGroup>

              <div className="bg-gradient-cta mt-14 rounded-3xl px-6 py-10 text-center sm:px-10">
                <h2 className="type-h3 text-white!">Want to work with us?</h2>
                <Hi className="mt-2 block text-white">
                  क्या आप भी हमारे साथ जुड़ना चाहते हैं?
                </Hi>
                {/* Pure white, not white/85: the gold end of the CTA ramp only
                    clears AA at full opacity. */}
                <p className="type-body mx-auto mt-4 max-w-xl text-white">
                  Shops that can honour reward coupons, schools that can host a
                  quiz, and groups that can run a camp with us — we would like to
                  hear from you.
                </p>
                <ButtonLink href="/contact" variant="onDark" className="mt-7">
                  Talk to the team
                </ButtonLink>
              </div>
            </>
          )}
        </Container>
      </Section>
    </>
  );
}
