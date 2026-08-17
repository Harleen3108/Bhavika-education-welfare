import {
  Skeleton,
  SkeletonPageHeader,
  SkeletonQuizCard,
  SkeletonScreen,
} from "@/components/ui/Skeleton";

export default function QuizzesLoading() {
  return (
    <SkeletonScreen label="Loading quizzes">
      <SkeletonPageHeader />

      <div className="space-y-8">
        {/* Daily, then weekly — the two sections the page always renders. */}
        {[3, 2].map((cards, section) => (
          <section key={section}>
            <Skeleton className="mb-4 h-5 w-36" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: cards }, (_, i) => (
                <SkeletonQuizCard key={i} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </SkeletonScreen>
  );
}
