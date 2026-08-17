import * as React from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";

/** Consistent interior-page hero with a soft brand gradient. */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-ink-200 bg-gradient-to-b from-brand-50 to-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent-100/40 blur-3xl"
      />
      <Container className="relative py-14 text-center sm:py-16 lg:py-20">
        {eyebrow && (
          <Badge tone="accent" className="mb-4">
            {eyebrow}
          </Badge>
        )}
        <h1 className="mx-auto max-w-3xl text-3xl font-bold sm:text-4xl lg:text-5xl">{title}</h1>
        {description && (
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-600 sm:text-lg">
            {description}
          </p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </Container>
    </section>
  );
}
