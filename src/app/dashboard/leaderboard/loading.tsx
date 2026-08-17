import {
  Skeleton,
  SkeletonCard,
  SkeletonPageHeader,
  SkeletonScreen,
} from "@/components/ui/Skeleton";

export default function LeaderboardLoading() {
  return (
    <SkeletonScreen label="Loading leaderboard">
      <SkeletonPageHeader />

      {/* Period tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["w-16", "w-20", "w-20", "w-24"].map((w) => (
          <Skeleton key={w} className={`h-9 rounded-full ${w}`} />
        ))}
      </div>

      {/* "Your rank" card */}
      <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:p-6">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div>
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="mt-1.5 h-6 w-16" />
            </div>
          </div>
          <div className="flex flex-col items-end">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="mt-1.5 h-6 w-14" />
          </div>
        </div>
      </div>

      <SkeletonCard>
        <div className="space-y-2">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2.5"
            >
              <Skeleton className="h-5 w-5 shrink-0" />
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-14 shrink-0" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </SkeletonScreen>
  );
}
