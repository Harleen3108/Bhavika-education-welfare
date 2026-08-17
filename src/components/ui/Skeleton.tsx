import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Placeholder block for route-level loading UI.
 *
 * Skeletons are decorative: the whole fallback is announced once by its
 * container (see `SkeletonScreen`), so individual blocks stay hidden from
 * assistive tech rather than reading out as dozens of empty nodes.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-ink-200/70", className)}
      {...props}
    />
  );
}

/** A line of text. `w` lets a block of lines end on a short, natural ragged edge. */
export function SkeletonText({
  lines = 1,
  className,
  widths,
}: {
  lines?: number;
  className?: string;
  widths?: string[];
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", widths?.[i] ?? (i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"))}
        />
      ))}
    </div>
  );
}

/**
 * Wraps a route fallback. `aria-busy` + a polite live region tell screen-reader
 * users the page is loading without narrating the placeholder shapes.
 */
export function SkeletonScreen({
  label = "Loading",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Mirrors <PageHeader />: a title and one line of description. */
export function SkeletonPageHeader({ withDescription = true }: { withDescription?: boolean }) {
  return (
    <div className="mb-6">
      <Skeleton className="h-8 w-56 sm:h-9 sm:w-72" />
      {withDescription && <Skeleton className="mt-2 h-4 w-72 max-w-full" />}
    </div>
  );
}

/** Mirrors <StatCard />: icon tile, small label, large value. */
export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl border border-ink-200 bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="mt-2 h-6 w-16" />
        </div>
      </div>
    </div>
  );
}

/** The 2/4-up stat grid used by the dashboard and wallet pages. */
export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

/** Mirrors <QuizListCard />: badge row, title, description, meta, button. */
export function SkeletonQuizCard() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-ink-200 bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-5 w-3/4" />
      <SkeletonText className="mt-2" lines={2} widths={["w-full", "w-5/6"]} />
      <div className="mt-3 flex items-center gap-4">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-3.5 w-14" />
      </div>
      <div className="mt-auto pt-4">
        <Skeleton className="h-9 w-full rounded-full" />
      </div>
    </div>
  );
}

/** Mirrors a <TransactionList /> / <LeaderboardList /> row. */
export function SkeletonListRow({ trailingWidth = "w-14" }: { trailingWidth?: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-1.5 h-3 w-24" />
      </div>
      <Skeleton className={cn("h-4 shrink-0", trailingWidth)} />
    </div>
  );
}

export function SkeletonList({
  rows = 5,
  trailingWidth,
}: {
  rows?: number;
  trailingWidth?: string;
}) {
  return (
    <div className="divide-y divide-ink-100">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonListRow key={i} trailingWidth={trailingWidth} />
      ))}
    </div>
  );
}

/** Generic card shell so route fallbacks keep the real page's card rhythm. */
export function SkeletonCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-200 bg-surface p-5 shadow-card sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
