import { Container, Section } from "@/components/ui/Container";
import { Skeleton, SkeletonCard, SkeletonScreen } from "@/components/ui/Skeleton";

/*
  Public pages open with a warm hero band and then a card grid. The band is
  painted for real (not as a placeholder) so the navbar never floats above a
  blank page mid-navigation.
*/
export default function PublicLoading() {
  return (
    <SkeletonScreen label="Loading page">
      <section className="bg-warm-glow">
        <Container className="py-14 sm:py-18">
          <div className="max-w-3xl">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-9 w-full max-w-xl sm:h-11" />
            <Skeleton className="mt-3 h-9 w-2/3 max-w-md sm:h-11" />
            <div className="mt-5 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </Container>
      </section>

      <Section className="pt-10!">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i}>
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="mt-4 h-5 w-3/5" />
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
              </SkeletonCard>
            ))}
          </div>
        </Container>
      </Section>
    </SkeletonScreen>
  );
}
