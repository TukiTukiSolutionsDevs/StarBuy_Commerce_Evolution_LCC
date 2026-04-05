import { Container } from '@/components/ui/Container';
import { Skeleton } from '@/components/ui/Skeleton';

export default function CollectionLoading() {
  return (
    <Container as="main" className="py-8 sm:py-12">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Header skeleton */}
      <Skeleton className="mb-2 h-8 w-48" />
      <Skeleton className="mb-8 h-4 w-64" />

      {/* Controls skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-36 rounded-[var(--radius-md)]" />
      </div>

      {/* Product grid skeleton */}
      <Skeleton.ProductGrid count={12} />
    </Container>
  );
}
