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
        <p className="type-label mb-3 text-accent-600">{eyebrow}</p>
      )}
      <h2 className="type-h2">{title}</h2>
      {description && (
        <p className="type-body-lg mt-4 text-ink-600">{description}</p>
      )}
    </div>
  );
}
