import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "accent" | "neutral" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  accent: "bg-accent-50 text-accent-700 ring-accent-200",
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  success: "bg-green-50 text-green-700 ring-green-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "type-label inline-flex items-center gap-1.5 rounded-full px-3 py-1 ring-1 ring-inset",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
