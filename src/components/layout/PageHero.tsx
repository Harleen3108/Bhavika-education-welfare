import * as React from "react";
import { Container } from "@/components/ui/Container";
import { Hi } from "@/components/ui/Bilingual";

/**
 * Consistent interior-page hero.
 *
 * Bilingual by default: pass `titleHi` / `eyebrowHi` and the Hindi line renders
 * under its English counterpart, matching the rhythm used on the homepage.
 */
export function PageHero({
  eyebrow,
  eyebrowHi,
  title,
  titleHi,
  description,
  descriptionHi,
  align = "center",
  children,
}: {
  eyebrow?: string;
  eyebrowHi?: string;
  title: string;
  titleHi?: string;
  description?: string;
  descriptionHi?: string;
  align?: "center" | "left";
  children?: React.ReactNode;
}) {
  const centered = align === "center";
  return (
    <section className="bg-warm-glow relative overflow-hidden border-b border-ink-200">
      <Container
        className={`relative py-14 sm:py-16 lg:py-20 ${centered ? "text-center" : ""}`}
      >
        {eyebrow && (
          <p className="type-label mb-4 text-brand-700">
            {eyebrow}
            {eyebrowHi && (
              <Hi inline className="ml-2 normal-case tracking-normal">
                {eyebrowHi}
              </Hi>
            )}
          </p>
        )}

        <h1 className={`type-h1 max-w-3xl ${centered ? "mx-auto" : ""}`}>{title}</h1>
        {titleHi && (
          <Hi
            className={`mt-3 block max-w-3xl text-xl font-semibold text-brand-700 sm:text-2xl ${
              centered ? "mx-auto" : ""
            }`}
          >
            {titleHi}
          </Hi>
        )}

        {description && (
          <p
            className={`type-body-lg mt-5 max-w-2xl text-ink-600 ${
              centered ? "mx-auto" : ""
            }`}
          >
            {description}
          </p>
        )}
        {descriptionHi && (
          <Hi
            className={`mt-2 block max-w-2xl text-ink-600 ${centered ? "mx-auto" : ""}`}
          >
            {descriptionHi}
          </Hi>
        )}

        {children && <div className="mt-7">{children}</div>}
      </Container>
    </section>
  );
}
