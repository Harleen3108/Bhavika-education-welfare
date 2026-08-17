import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PUBLIC_NAV, SITE } from "@/lib/constants";

export function Footer() {
  const year = 2026; // static to keep server/client render deterministic
  return (
    <footer className="mt-auto border-t border-ink-200 bg-brand-900 text-ink-100">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        <div className="lg:col-span-1">
          <Logo variant="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            {SITE.tagline}. Building brighter futures through education and community welfare.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Explore</h4>
          <ul className="mt-4 space-y-2 text-sm">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-white/70 transition-colors hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Engage</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/register" className="text-white/70 hover:text-white">Create account</Link></li>
            <li><Link href="/login" className="text-white/70 hover:text-white">Member login</Link></li>
            <li><Link href="/dashboard/quizzes" className="text-white/70 hover:text-white">Take a quiz</Link></li>
            <li><Link href="/dashboard/leaderboard" className="text-white/70 hover:text-white">Leaderboard</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Contact</h4>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <Mail size={16} className="mt-0.5 shrink-0" />
              <a href={`mailto:${SITE.contact.email}`} className="hover:text-white break-all">
                {SITE.contact.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Phone size={16} className="mt-0.5 shrink-0" />
              <a href={`tel:${SITE.contact.phone}`} className="hover:text-white">
                {SITE.contact.phone}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0" />
              <span>{SITE.contact.address}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/60 sm:flex-row">
          <p>© {year} {SITE.name}. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
