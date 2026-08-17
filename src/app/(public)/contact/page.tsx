import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { Card, CardBody } from "@/components/ui/Card";
import { ContactForm } from "@/components/public/ContactForm";
import { getContactInfo } from "@/server/services/content.service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Bhavika Education & Welfare Foundation. Reach us by phone, email or WhatsApp, or send us a message.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const info = await getContactInfo();
  const waNumber = info.whatsapp.replace(/\D/g, "");

  return (
    <>
      <PageHero
        eyebrow="Contact"
        eyebrowHi="संपर्क करें"
        title="Talk to our team"
        titleHi="हमसे बात करें"
        description="For admissions, partnerships, donations or press — reach us on WhatsApp for the fastest reply."
        descriptionHi="सबसे तेज़ जवाब के लिए व्हाट्सएप पर संपर्क करें।"
      />

      <Section>
        <Container className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
          {/* Info column */}
          <div className="space-y-4">
            <ContactRow icon={<Mail size={20} />} label="Email" href={`mailto:${info.email}`}>
              {info.email}
            </ContactRow>
            <ContactRow icon={<Phone size={20} />} label="Phone" href={`tel:${info.phone}`}>
              {info.phone}
            </ContactRow>
            <ContactRow icon={<MapPin size={20} />} label="Address">
              {info.address}
            </ContactRow>
            <ContactRow icon={<Clock size={20} />} label="Hours">
              {info.hours}
            </ContactRow>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 font-medium text-white transition-opacity hover:opacity-90"
              >
                <MessageCircle size={18} /> WhatsApp
              </a>
              <a
                href={`tel:${info.phone}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-medium text-white transition-colors hover:bg-brand-700"
              >
                <Phone size={18} /> Call now
              </a>
            </div>
          </div>

          {/* Form column */}
          <Card>
            <CardBody className="sm:p-8">
              <h2 className="text-xl font-bold text-ink-900">Send us a message</h2>
              <p className="mt-1 mb-6 text-sm text-ink-500">
                We usually respond within 1–2 business days.
              </p>
              <ContactForm />
            </CardBody>
          </Card>
        </Container>
      </Section>

      {/* Map */}
      {info.mapEmbedUrl && (
        <Section className="pt-0">
          <Container>
            <div className="overflow-hidden rounded-2xl border border-ink-200 shadow-card">
              <iframe
                src={info.mapEmbedUrl}
                title="Our location"
                width="100%"
                height="420"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block w-full"
                style={{ border: 0 }}
                allowFullScreen
              />
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}

function ContactRow({
  icon,
  label,
  href,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  children: React.ReactNode;
}) {
  const content = (
    <Card interactive={!!href}>
      <CardBody className="flex items-center gap-4 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
          <p className="truncate font-medium text-ink-800">{children}</p>
        </div>
      </CardBody>
    </Card>
  );
  return href ? (
    <a href={href} className="block">
      {content}
    </a>
  ) : (
    content
  );
}
