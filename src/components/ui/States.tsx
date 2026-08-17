import * as React from "react";
import { cn } from "@/lib/utils";

/** Loading spinner. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600",
        className,
      )}
    />
  );
}

/** Centered empty state. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-white/60 px-6 py-14 text-center",
        className,
      )}
    >
      {icon && <div className="mb-4 text-brand-400">{icon}</div>}
      <h3 className="text-base font-semibold text-ink-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Inline alert / message box. */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-brand-50 text-brand-700 border-brand-200",
    success: "bg-green-50 text-green-800 border-green-200",
    warning: "bg-amber-50 text-amber-900 border-amber-200",
    danger: "bg-red-50 text-red-800 border-red-200",
  } as const;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && "mt-1")}>{children}</div>}
    </div>
  );
}
