import {
  Skeleton,
  SkeletonCard,
  SkeletonList,
  SkeletonPageHeader,
  SkeletonScreen,
  SkeletonStatGrid,
} from "@/components/ui/Skeleton";

export default function WalletLoading() {
  return (
    <SkeletonScreen label="Loading wallet">
      <SkeletonPageHeader />

      <SkeletonStatGrid />

      <SkeletonCard className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-5 w-44" />
          <div className="flex flex-wrap gap-2">
            {["w-14", "w-16", "w-20", "w-20"].map((w) => (
              <Skeleton key={w} className={`h-8 rounded-full ${w}`} />
            ))}
          </div>
        </div>

        <SkeletonList rows={8} trailingWidth="w-16" />

        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-9 rounded-full" />
          ))}
        </div>
      </SkeletonCard>
    </SkeletonScreen>
  );
}
