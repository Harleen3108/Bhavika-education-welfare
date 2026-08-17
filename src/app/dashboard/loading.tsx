import {
  Skeleton,
  SkeletonCard,
  SkeletonList,
  SkeletonPageHeader,
  SkeletonScreen,
  SkeletonStatGrid,
} from "@/components/ui/Skeleton";

/*
  Fallback for the dashboard home and for any nested member route that does not
  ship its own loading.tsx (profile, referrals, benefits). It stays close to the
  shared shape those pages have — header, points row, then cards — so the swap
  to real content does not jump the layout.
*/
export default function DashboardLoading() {
  return (
    <SkeletonScreen label="Loading your dashboard">
      <SkeletonPageHeader />

      <SkeletonStatGrid />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SkeletonCard>
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="rounded-xl border border-ink-200 p-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="mt-2 h-4 w-4/5" />
                  <Skeleton className="mt-2 h-3 w-2/5" />
                  <Skeleton className="mt-3 h-9 w-28 rounded-full" />
                </div>
              ))}
            </div>
          </SkeletonCard>

          <SkeletonCard>
            <div className="mb-2 flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-14" />
            </div>
            <SkeletonList rows={4} />
          </SkeletonCard>
        </div>

        <div className="space-y-6">
          <SkeletonCard>
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="rounded-xl bg-ink-50 py-3 text-center">
                  <Skeleton className="mx-auto h-6 w-8" />
                  <Skeleton className="mx-auto mt-1.5 h-3 w-12" />
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-ink-50 p-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-1.5 h-5 w-32" />
            </div>
            <Skeleton className="mt-4 h-9 w-full rounded-full" />
          </SkeletonCard>

          <SkeletonCard>
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2.5"
                >
                  <Skeleton className="h-5 w-5 shrink-0" />
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-12 shrink-0" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>
      </div>
    </SkeletonScreen>
  );
}
