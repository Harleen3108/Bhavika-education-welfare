import Link from "next/link";
import { ArrowLeft, BadgeCheck, Store, Users } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Hi } from "@/components/ui/Bilingual";
import { PUBLIC_NAV, SITE } from "@/lib/constants";
import { IMPACT } from "@/lib/site-content";

/**
 * Trust points shown beside every auth form. Shared marketing copy lives in
 * site-content.ts; these three answer the questions a person actually asks with
 * their hand on the signup button, so they sit next to the layout that renders
 * them. The student count is read from IMPACT so the two can never drift.
 */
const TRUST = [
  {
    icon: BadgeCheck,
    en: "Free forever",
    hi: "हमेशा नि:शुल्क",
    detail: "No fee to join, to play, or to claim a reward.",
    detailHi: "जुड़ने, खेलने या इनाम लेने का कोई शुल्क नहीं।",
  },
  {
    icon: Users,
    en: `${IMPACT[0].value} students`,
    hi: "छात्र हमारे साथ",
    detail: "Learning with us across 500+ partner schools.",
    detailHi: "500+ साझेदार विद्यालयों के बच्चे हमारे साथ सीख रहे हैं।",
  },
  {
    icon: Store,
    en: "Points you can spend",
    hi: "पॉइंट्स जो काम आएँ",
    detail: "Redeemable as a real discount at Jai Maa Durga.",
    detailHi: "जय माँ दुर्गा स्टोर पर असली छूट में बदलें।",
  },
] as const;

const YEAR = 2026; // static to keep server/client render deterministic

/**
 * The destinations worth offering someone who is mid-signup, taken from the
 * public nav so the labels and Hindi can never drift.
 *
 * Deliberately not the whole eight-item <Navbar />: that bar plus its logo and
 * two CTAs measures wider than the 1024px container it first appears in, and it
 * would put a second "Log in / Play quiz" pair directly above a login form. Five
 * links fit on one line from 360px up, and the roomier phone-nav problem the
 * full navbar solves with a JS drawer does not exist at this size.
 */
const AUTH_NAV_HREFS: readonly string[] = ["/", "/about", "/quiz", "/rewards", "/contact"];
const AUTH_NAV = PUBLIC_NAV.filter((item) => AUTH_NAV_HREFS.includes(item.href));

/**
 * Every auth page carries this. Without it a visitor who lands on /login has no
 * way back to the site at all — which is exactly what was reported.
 *
 * One flex row that wraps: below lg the links drop to their own full-width line
 * under the logo (`order-last w-full`), at lg they rejoin the row and centre
 * themselves. No duplicated markup, so no duplicated links in the a11y tree.
 */
function AuthHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-background/90 backdrop-blur-md">
      <div aria-hidden className="bg-gradient-brand h-1" />

      <nav
        aria-label="Site"
        className="container-page flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 sm:py-3"
      >
        <Logo size={36} className="shrink-0" />

        <ul className="order-last flex w-full flex-wrap items-center gap-x-0.5 gap-y-0.5 border-t border-ink-100 pt-2 lg:order-none lg:w-auto lg:flex-1 lg:justify-center lg:gap-x-1 lg:border-0 lg:pt-0">
          {AUTH_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-full px-2 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900 lg:px-3 lg:py-2 lg:text-[0.9375rem] lg:font-semibold"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
        >
          <ArrowLeft size={16} aria-hidden />
          <span className="whitespace-nowrap">
            Back<span className="hidden sm:inline"> to site</span>
          </span>
          <Hi inline>
            वापस<span className="hidden sm:inline"> साइट पर</span>
          </Hi>
        </Link>
      </nav>
    </header>
  );
}

/** Warm coral wash over the deep ink ground — white type stays fully legible. */
const panelGlow = {
  backgroundImage:
    "radial-gradient(38rem 26rem at 8% -6%, rgb(249 92 27 / 0.42), transparent 62%), " +
    "radial-gradient(30rem 24rem at 96% 92%, rgb(244 63 94 / 0.30), transparent 60%), " +
    "radial-gradient(26rem 20rem at 78% 12%, rgb(245 158 11 / 0.18), transparent 60%)",
};

/**
 * The dark storytelling column, lg and up.
 *
 * It is a plain stretched grid item — no `h-dvh`, no sticky. A viewport-locked
 * panel with `overflow-hidden` silently ate its own bottom rows on any short
 * desktop window (1024x600, 1280x720), and there is nothing here worth hiding.
 * Stretched, the row is as tall as its tallest side and the document scrolls
 * normally at every height.
 */
function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-night-950 lg:flex lg:flex-col lg:justify-center">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={panelGlow} />

      <div className="relative p-10 xl:p-12">
        <p className="type-label text-white/60">
          {SITE.tagline}
          <Hi inline className="ml-2 normal-case tracking-normal">
            {SITE.taglineHi}
          </Hi>
        </p>

        {/* type-h3, not type-h2: the column is 26rem wide, and h2 clamps to 42px
            there — three ragged lines instead of two. */}
        <h2 className="type-h3 mt-4 text-white!">Learn today. Earn today.</h2>
        <Hi className="mt-2 block text-lg text-white/80">आज सीखो, आज कमाओ।</Hi>

        <p className="type-body mt-5 text-white/70">
          Free daily quizzes for students in small towns and villages. Every correct
          answer earns points your family can actually spend.
        </p>
        {/* Hindi sits at the same opacity as the English it pairs with. Fading it
            further made the smallest text on the page the least readable. */}
        <Hi className="mt-2 block text-white/70">
          छोटे शहरों और गाँवों के बच्चों के लिए रोज़ाना मुफ़्त क्विज़। हर सही जवाब पर
          पॉइंट्स, जो आपके परिवार के काम आते हैं।
        </Hi>

        <ul className="mt-8 space-y-5">
          {TRUST.map(({ icon: Icon, en, hi, detail, detailHi }) => (
            <li key={en} className="flex gap-4">
              <span
                aria-hidden
                className="bg-gradient-cta flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_12px_-2px_rgb(249_92_27/0.45)]"
              >
                <Icon size={19} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-white">
                  {en}
                  <Hi inline className="ml-2 text-white/80">
                    {hi}
                  </Hi>
                </p>
                <p className="type-small mt-0.5 text-white/65">{detail}</p>
                <Hi className="mt-0.5 block text-[0.8rem] text-white/65">{detailHi}</Hi>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/** The panel's promises, condensed to one wrapping row for the widths that hide it. */
function TrustStrip() {
  return (
    <ul className="mb-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-ink-600 lg:hidden">
      {TRUST.map(({ icon: Icon, en, hi }) => (
        <li key={en} className="inline-flex items-center gap-1.5">
          <Icon size={13} className="shrink-0 text-brand-500" aria-hidden />
          {en}
          <Hi inline>{hi}</Hi>
        </li>
      ))}
    </ul>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AuthHeader />

      {/* minmax(0,1fr) on the form track: a plain 1fr floors at min-content, and
          one long unbroken email address would then widen the page itself. */}
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[26rem_minmax(0,1fr)] xl:grid-cols-[30rem_minmax(0,1fr)]">
        <BrandPanel />

        <div className="bg-warm-glow flex min-w-0 flex-1 flex-col">
          <main className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
            <div className="mx-auto w-full max-w-md min-w-0">
              <TrustStrip />
              {children}
            </div>
          </main>

          <footer className="px-4 pb-8 text-center text-xs text-ink-500 sm:px-6">
            <p>
              © {YEAR} {SITE.shortName}
              <span aria-hidden className="mx-2 text-ink-300">
                ·
              </span>
              <Link href="/terms" className="hover:text-brand-700">
                Terms
              </Link>
              <span aria-hidden className="mx-2 text-ink-300">
                ·
              </span>
              <Link href="/privacy" className="hover:text-brand-700">
                Privacy
              </Link>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
