import Link from "next/link";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Hi } from "@/components/ui/Bilingual";
import { PUBLIC_NAV, FOOTER_NAV, SITE } from "@/lib/constants";

export function Footer() {
  const year = 2026; // static to keep server/client render deterministic

  return (
    <footer className="mt-auto bg-night-950 text-white">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        <div>
          <Logo variant="light" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/65">
            {SITE.description}
          </p>
          <p className="mt-4">
            <span className="type-label text-brand-400">{SITE.tagline}</span>
            <Hi className="mt-1 block text-sm text-white/50">{SITE.taglineHi}</Hi>
          </p>
        </div>

        <div>
          <h4 className="type-label text-white">Explore</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {PUBLIC_NAV.filter((i) => i.href !== "/").map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-white/65 transition-colors hover:text-white"
                >
                  {item.label} <Hi inline>{item.hi}</Hi>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="type-label text-white">More</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {FOOTER_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-white/65 transition-colors hover:text-white"
                >
                  {item.label} <Hi inline>{item.hi}</Hi>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/register" className="text-white/65 hover:text-white">
                Create account <Hi inline>खाता बनाएँ</Hi>
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-white/65 hover:text-white">
                Member login <Hi inline>लॉग इन</Hi>
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="type-label text-white">Contact</h4>
          <ul className="mt-4 space-y-3 text-sm text-white/65">
            <li className="flex items-start gap-2.5">
              <MessageCircle size={16} className="mt-0.5 shrink-0 text-brand-400" />
              <a
                href={`https://wa.me/${SITE.contact.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                WhatsApp <Hi inline>व्हाट्सएप</Hi>
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone size={16} className="mt-0.5 shrink-0 text-brand-400" />
              <a href={`tel:${SITE.contact.phone}`} className="hover:text-white">
                {SITE.contact.phone}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail size={16} className="mt-0.5 shrink-0 text-brand-400" />
              <a
                href={`mailto:${SITE.contact.email}`}
                className="break-all hover:text-white"
              >
                {SITE.contact.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-brand-400" />
              <span>{SITE.contact.address}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/50 sm:flex-row">
          <p>
            © {year} {SITE.name}. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
