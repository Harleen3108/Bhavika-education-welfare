import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Bilingual type primitives.
 *
 * Every public surface pairs English with Hindi. Rather than an i18n runtime,
 * the pair is authored together and always rendered together — the Hindi line
 * is content, not a translation toggle.
 *
 * Hindi is wrapped in `lang="hi"` so screen readers switch voice and the
 * browser picks Devanagari shaping rules.
 */

/** Hindi text. Use inside a heading block, under the English line. */
export function Hi({
  children,
  inline = false,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { inline?: boolean }) {
  return (
    <span
      lang="hi"
      className={cn(inline ? "type-hi-inline" : "type-hi", className)}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * An English line with its Hindi counterpart stacked underneath.
 * `as` controls the wrapper element so this works as a heading or a label.
 */
export function BiText({
  en,
  hi,
  as: Tag = "div",
  className,
  hiClassName,
  ...props
}: Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
  en: React.ReactNode;
  hi?: React.ReactNode;
  as?: React.ElementType;
  hiClassName?: string;
}) {
  return (
    <Tag className={className} {...props}>
      {en}
      {hi ? (
        <>
          {" "}
          <Hi className={cn("mt-1 block", hiClassName)}>{hi}</Hi>
        </>
      ) : null}
    </Tag>
  );
}

/**
 * Section heading: eyebrow (EN + HI inline) → English title → Hindi title →
 * optional English description. This is the rhythm used across every band of
 * the public site, so it lives in one place.
 */
export function BiHeading({
  eyebrow,
  eyebrowHi,
  title,
  titleHi,
  description,
  align = "center",
  tone = "brand",
  className,
}: {
  eyebrow?: string;
  eyebrowHi?: string;
  title: React.ReactNode;
  titleHi?: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  tone?: "brand" | "light";
  className?: string;
}) {
  const light = tone === "light";
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "type-label mb-3",
            light ? "text-white/70" : "text-brand-700",
          )}
        >
          {eyebrow}
          {eyebrowHi && (
            <Hi inline className="ml-2 normal-case tracking-normal">
              {eyebrowHi}
            </Hi>
          )}
        </p>
      )}
      <h2 className={cn("type-h2", light && "text-white!")}>{title}</h2>
      {titleHi && (
        <Hi
          className={cn(
            "mt-2 block text-[1.05rem] sm:text-xl",
            light ? "text-white/75" : "text-brand-700",
          )}
        >
          {titleHi}
        </Hi>
      )}
      {description && (
        <p
          className={cn(
            "type-body-lg mt-5",
            light ? "text-white/75" : "text-ink-600",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
