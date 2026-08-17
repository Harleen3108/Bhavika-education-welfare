import * as React from "react";
import { Card } from "@/components/ui/Card";
import { Label, FieldError } from "@/components/ui/Field";
import { Hi } from "@/components/ui/Bilingual";
import { cn } from "@/lib/utils";

/**
 * The form panel of the auth split layout.
 *
 * Brand storytelling lives in the (auth) layout, so this stays a quiet
 * container: heading, form, one footer line. The Hindi props are optional
 * because the password-reset screens still call this with English-only copy.
 */
export function AuthCard({
  eyebrow,
  eyebrowHi,
  title,
  titleHi,
  subtitle,
  subtitleHi,
  children,
  footer,
  className,
}: {
  eyebrow?: string;
  eyebrowHi?: string;
  title: string;
  titleHi?: string;
  subtitle?: string;
  subtitleHi?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("animate-fade-up overflow-hidden", className)}>
      <div className="p-6 sm:p-8">
        {eyebrow && (
          <p className="type-label mb-3 text-brand-700">
            {eyebrow}
            {eyebrowHi && (
              <Hi inline className="ml-2 normal-case tracking-normal">
                {eyebrowHi}
              </Hi>
            )}
          </p>
        )}

        <h1 className="type-h3">{title}</h1>
        {titleHi && <Hi className="mt-1.5 block text-brand-700">{titleHi}</Hi>}

        {subtitle && <p className="type-small mt-3 text-ink-600">{subtitle}</p>}
        {subtitleHi && (
          <Hi className="mt-1 block text-[0.8rem] text-ink-500">{subtitleHi}</Hi>
        )}

        <div className="mt-6">{children}</div>
      </div>

      {footer && (
        <div className="border-t border-ink-100 bg-ink-50/60 px-6 py-4 text-center text-sm text-ink-600 sm:px-8">
          {footer}
        </div>
      )}
    </Card>
  );
}

/**
 * Labelled field with a bilingual label.
 *
 * `FormField` in the UI kit types its label as a plain string, and every auth
 * label needs its Hindi counterpart beside it — plus the password field needs a
 * "Forgot?" link on the same row. Hence this local wrapper rather than a change
 * to the shared primitive.
 */
export function AuthField({
  label,
  labelHi,
  htmlFor,
  required,
  error,
  hint,
  hintHi,
  action,
  children,
}: {
  label: string;
  labelHi?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  hintHi?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* min-w-0 so a long bilingual label wraps instead of widening the row and
          pushing the action (e.g. "Forgot?") off the card at 360px. */}
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor} required={required} className="mb-0 min-w-0">
          {label}
          {labelHi && <Hi inline className="ml-1.5">{labelHi}</Hi>}
        </Label>
        {action}
      </div>
      {children}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-ink-500">
          {hint}
          {hintHi && <Hi inline className="ml-1.5">{hintHi}</Hi>}
        </p>
      )}
      <FieldError>{error}</FieldError>
    </div>
  );
}
