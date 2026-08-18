import * as React from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  tone = "brand",
  isPoints = true,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  tone?: "brand" | "accent" | "neutral";
  isPoints?: boolean;
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    accent: "bg-accent-50 text-accent-600",
    neutral: "bg-ink-100 text-ink-600",
  };
  return (
    /*
      Stacked below sm, side-by-side from sm up. These sit two-up at 360px,
      which leaves ~124px of content box; beside a 48px icon a formatted total
      like "1,28,450" had nowhere to go and wrapped mid-number. Putting the icon
      on its own line gives the figure the card's full width, and the value is
      never allowed to break — a split numeral reads as two numbers.
    */
    <Card>
      <CardBody className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5 sm:py-5">
        {icon && (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl",
              tones[tone],
            )}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs text-ink-500 sm:text-sm">{label}</p>
          <p className="font-display text-xl font-bold tabular-nums text-ink-900 sm:text-2xl">
            {isPoints && typeof value === "number" ? formatPoints(value) : value}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
