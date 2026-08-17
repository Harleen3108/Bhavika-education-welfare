import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

/*
  The quiz page resolves eligibility before it can decide what to show, so this
  mirrors the most common outcome — the centred intro card with the start
  button. Matching that shape keeps the click-to-content transition calm.
*/
export default function QuizPlayLoading() {
  return (
    <SkeletonScreen label="Loading quiz">
      <Skeleton className="mb-5 h-4 w-28" />

      <div className="mx-auto max-w-lg rounded-2xl border border-ink-200 bg-surface p-5 shadow-card sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <Skeleton className="mt-4 h-6 w-56 max-w-full" />

          <div className="mt-4 flex justify-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>

          <div className="mt-4 w-full space-y-2">
            <Skeleton className="mx-auto h-3.5 w-full" />
            <Skeleton className="mx-auto h-3.5 w-11/12" />
            <Skeleton className="mx-auto h-3.5 w-2/3" />
          </div>

          <Skeleton className="mt-6 h-13 w-full rounded-full" />
        </div>
      </div>
    </SkeletonScreen>
  );
}
