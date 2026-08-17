import * as React from "react";
import Image from "next/image";
import { Quote, ExternalLink } from "lucide-react";
import type { TestimonialDTO, PartnerDTO } from "@/server/services/content.service";
import { Card, CardBody } from "@/components/ui/Card";
import { TiltCard } from "@/components/motion";
import { cn } from "@/lib/utils";

/**
 * The tilt is deliberately shallow. These cards sit in dense grids where a
 * large rotation reads as a gimmick and makes neighbouring cards look crooked;
 * a few degrees just picks out the one under the pointer. TiltCard itself opts
 * out on touch and under reduced motion, and the card renders identically
 * either way, so nothing here depends on the effect running.
 */
const TILT_DEGREES = 6;

/* ─────────────────────────── Script detection ─────────────────────────────
   Testimonials arrive in three registers: English, Hinglish typed in Latin
   script, and full Devanagari. Which register a given person used is data, so
   nothing below may key off a name — it all keys off the characters in the
   string, and a row an admin adds tomorrow picks up the right treatment on its
   own.
   ────────────────────────────────────────────────────────────────────────── */

const DEVANAGARI = /[\u0900-\u097F]/;

/** Devanagari stretches of a string, with the Latin gaps between them. */
function scriptRuns(text: string): { text: string; hi: boolean }[] {
  const runs: { text: string; hi: boolean }[] = [];
  let cursor = 0;
  // Whitespace and ZW joiners *between* Devanagari words are pulled into the
  // run, so a Hindi phrase becomes one span instead of one span per word.
  const pattern = /[\u0900-\u097F]+(?:[\s\u200C\u200D]+[\u0900-\u097F]+)*/g;
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    if (start > cursor) runs.push({ text: text.slice(cursor, start), hi: false });
    runs.push({ text: match[0], hi: true });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) runs.push({ text: text.slice(cursor), hi: false });
  return runs;
}

/**
 * Renders a possibly-mixed string with only its Devanagari stretches switched
 * to the Hindi face and `lang="hi"`.
 *
 * WHY per-run and not per-element: roles are mixed mid-line — "Student, Class 9
 * · छात्र" — and putting the Hindi font on the whole label would also re-set the
 * Latin half in a face the rest of the site never uses. Splitting keeps each
 * script in its own font and gives screen readers an accurate language switch
 * at exactly the right boundary.
 */
function MixedScript({ text }: { text: string }) {
  if (!DEVANAGARI.test(text)) return <>{text}</>;
  return (
    <>
      {scriptRuns(text).map((run, i) =>
        run.hi ? (
          // Index keys are correct here: the runs are positional slices of one
          // immutable string, so a run's identity *is* its position.
          <span key={i} lang="hi" className="font-hindi">
            {run.text}
          </span>
        ) : (
          <React.Fragment key={i}>{run.text}</React.Fragment>
        ),
      )}
    </>
  );
}

/* ──────────────────────────────── Testimonials ─────────────────────────────*/

export function TestimonialCard({ t }: { t: TestimonialDTO }) {
  // Size and leading are a block-level decision — Devanagari matras and
  // ascenders need more vertical room than Latin does at the same size, so one
  // stray Hindi clause loosens the whole paragraph. Language and font-family are
  // NOT: quotes are routinely one or two English sentences closed by a Hindi
  // line, and tagging the whole blockquote `lang="hi"` would hand those English
  // sentences to a Hindi TTS voice. Hence the per-run treatment below.
  const hindi = DEVANAGARI.test(t.message);

  return (
    <TiltCard max={TILT_DEGREES} className="h-full rounded-2xl">
      <Card interactive className="relative h-full overflow-hidden">
        {/* Decoration only, never under text — bg-gradient-brand is the bright
            ramp and fails AA behind any label. */}
        <span aria-hidden className="bg-gradient-brand absolute inset-x-0 top-0 h-1" />

        {/* Oversized glyph, cropped by the card — gives the quote a backdrop
            without adding another element the reader has to parse. */}
        <Quote
          aria-hidden
          size={150}
          strokeWidth={1}
          className="pointer-events-none absolute -top-9 -right-8 text-brand-100"
        />

        {/* Extra top padding at both steps, not just the base one: CardBody's
            own `sm:p-6` would otherwise win back the top edge at ≥sm and crowd
            the hairline. */}
        <CardBody className="relative flex h-full flex-col pt-7 sm:pt-8">
          <figure className="flex h-full flex-col">
            <Quote aria-hidden size={26} className="mb-4 shrink-0 text-brand-600" />

            <blockquote
              className={cn(
                "flex-1 text-ink-700",
                hindi ? "text-[1.0625rem] leading-loose" : "type-body-lg",
              )}
            >
              <MixedScript text={t.message} />
            </blockquote>

            <figcaption className="mt-6 flex items-center gap-4 border-t border-ink-100 pt-5">
              {t.imageUrl ? (
                // The gradient ring is the whole reason for the wrapper: a
                // ring-offset would paint the card's own white, which vanishes
                // against it.
                <span
                  aria-hidden
                  className="bg-gradient-brand flex shrink-0 rounded-full p-[3px]"
                >
                  <Image
                    src={t.imageUrl}
                    // Empty alt: the name and role sit immediately beside the
                    // portrait, so announcing it again is pure noise.
                    alt=""
                    width={56}
                    height={56}
                    sizes="56px"
                    loading="lazy"
                    className="block h-14 w-14 rounded-full object-cover"
                  />
                </span>
              ) : (
                <span
                  aria-hidden
                  className="bg-gradient-cta flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
                >
                  {t.name.charAt(0).toUpperCase()}
                </span>
              )}

              <div className="min-w-0">
                <p className="font-display leading-snug font-semibold text-ink-900">
                  <MixedScript text={t.name} />
                </p>
                {t.role && (
                  <p className="type-small mt-0.5 text-brand-700">
                    <MixedScript text={t.role} />
                  </p>
                )}
              </div>
            </figcaption>
          </figure>
        </CardBody>
      </Card>
    </TiltCard>
  );
}

/* ─────────────────────────────────── Partners ──────────────────────────────*/

/**
 * Words that never earn a letter in a monogram — "Rotary Club of Rohtak" reads
 * as RCR, not RCOR.
 */
const MONOGRAM_SKIP = new Set(["of", "the", "and", "for", "at", "in", "ka", "ke", "ki"]);

/**
 * Initials for a partner's monogram tile.
 *
 * WHY generated rather than stored: these are real local organisations that
 * have no logo on file, and drawing a brand mark for somebody else's
 * organisation would misrepresent them. A tile built from their own initials
 * claims nothing. Up to three letters keeps the acronyms people already say out
 * loud intact — DEO, RCR, GSK — while a one-word name falls back to its opening
 * two letters rather than sitting on the tile as a lonely single glyph.
 */
export function partnerMonogram(name: string): string {
  // Latin + Devanagari + digits are the letter classes; everything else (space,
  // comma, dot, dash, ampersand) is a separator.
  const words = name
    .split(/[^0-9A-Za-z\u0900-\u097F]+/)
    .filter((w) => w.length > 0 && !MONOGRAM_SKIP.has(w.toLowerCase()));

  if (words.length === 0) return name.trim().slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Tile colours cycle by position rather than by a hash of the name. With five
 * tones and a 1-, 2- or 3-column wrap, no two neighbours — across or down —
 * ever land on the same colour, so eight partners read as eight distinct
 * organisations instead of one chip repeated eight times. Every tone is a stop
 * from the site's own signature ramp at a depth that clears AA for the white
 * monogram sitting on it.
 */
const PARTNER_TONES = [
  "bg-brand-700",
  "bg-accent-700",
  "bg-amber-glow-700",
  "bg-night-800",
  "bg-rose-glow-700",
] as const;

/**
 * The partner's mark: an uploaded logo when one exists, otherwise the generated
 * monogram. `className` carries the size so the same mark serves the full card
 * and the compact chip.
 */
function PartnerMark({
  p,
  index,
  className,
}: {
  p: PartnerDTO;
  index: number;
  className?: string;
}) {
  if (p.logoUrl) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-ink-200 bg-surface",
          className,
        )}
      >
        <Image
          src={p.logoUrl}
          alt=""
          width={128}
          height={128}
          sizes="128px"
          loading="lazy"
          className="h-full w-full object-contain p-1.5"
        />
      </span>
    );
  }

  const monogram = partnerMonogram(p.name);
  const hindi = DEVANAGARI.test(monogram);

  return (
    <span
      aria-hidden
      lang={hindi ? "hi" : undefined}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl font-bold text-white",
        // Devanagari initials get no letter-spacing: tracking pulls a matra away
        // from the consonant it belongs to.
        hindi ? "font-hindi" : "font-display tracking-wide",
        PARTNER_TONES[index % PARTNER_TONES.length],
        className,
      )}
    >
      {monogram}
    </span>
  );
}

/** Wraps a partner surface in its outbound link, when it has one. */
function PartnerLink({
  p,
  className,
  children,
}: {
  p: PartnerDTO;
  className?: string;
  children: React.ReactNode;
}) {
  if (!p.websiteUrl) return <>{children}</>;
  return (
    <a
      href={p.websiteUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn(
        "block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        className,
      )}
    >
      {children}
    </a>
  );
}

/** Full partner card: mark, name, and what they actually do with us. */
export function PartnerCard({ p, index = 0 }: { p: PartnerDTO; index?: number }) {
  return (
    <PartnerLink p={p} className="rounded-2xl">
      <TiltCard max={TILT_DEGREES} className="h-full rounded-2xl">
        <Card interactive className="group h-full">
          <CardBody className="flex h-full flex-col">
            <div className="flex items-start gap-4">
              <PartnerMark p={p} index={index} className="h-16 w-16 text-xl shadow-card" />
              <div className="min-w-0 flex-1">
                <p className="font-display leading-snug font-semibold text-ink-900">
                  <MixedScript text={p.name} />
                </p>
                {p.websiteUrl && (
                  <span className="type-small mt-1.5 inline-flex items-center gap-1 font-medium text-accent-700 transition-colors group-hover:text-accent-800">
                    Visit site <ExternalLink aria-hidden size={13} />
                  </span>
                )}
              </div>
            </div>

            {p.description && (
              <p className="type-small mt-4 flex-1 leading-relaxed text-ink-600">
                <MixedScript text={p.description} />
              </p>
            )}
          </CardBody>
        </Card>
      </TiltCard>
    </PartnerLink>
  );
}

/**
 * Compact partner pill for the homepage band — the mark plus the name, sized to
 * sit in a centred wrap that reads as a logo wall. It replaces a scrolling strip
 * of bare names: a marquee of three or eight plain words looks like a rendering
 * bug, whereas a wall of marks looks like a network.
 */
export function PartnerChip({ p, index = 0 }: { p: PartnerDTO; index?: number }) {
  return (
    <PartnerLink p={p} className="rounded-full">
      <span className="flex h-full items-center gap-3 rounded-full border border-ink-200 bg-surface py-2 pr-5 pl-2 shadow-card transition-shadow hover:shadow-card-hover">
        <PartnerMark p={p} index={index} className="h-11 w-11 rounded-full text-[0.8125rem]" />
        <span className="text-[0.9375rem] leading-tight font-semibold text-ink-900">
          <MixedScript text={p.name} />
        </span>
      </span>
    </PartnerLink>
  );
}
