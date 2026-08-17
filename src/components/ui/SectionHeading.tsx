import * as React from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent-600">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">{title}</h2>
      {description && (
        <p className="mt-3 text-base leading-relaxed text-ink-600 sm:text-lg">{description}</p>
      )}
    </div>
  );
}
