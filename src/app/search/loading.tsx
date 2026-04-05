import { Container } from '@/components/ui/Container';
import { Skeleton } from '@/components/ui/Skeleton';

export default function SearchLoading() {
  return (
    <Container as="main" className="py-8 sm:py-12">
      {/* Search input skeleton */}
      <Skeleton className="mb-8 h-14 w-full rounded-[var(--radius-lg)]" />

      {/* Results header */}
      <Skeleton className="mb-6 h-6 w-48" />

      {/* Product grid skeleton */}
      <Skeleton.ProductGrid count={8} />
    </Container>
  );
}
