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
    <Card>
      <CardBody className="flex items-center gap-4 py-5">
        {icon && (
          <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", tones[tone])}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm text-ink-500">{label}</p>
          <p className="font-display text-2xl font-bold text-ink-900">
            {isPoints && typeof value === "number" ? formatPoints(value) : value}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
