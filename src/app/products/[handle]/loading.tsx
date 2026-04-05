import { Container } from '@/components/ui/Container';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ProductLoading() {
  return (
    <Container as="main" className="py-8 sm:py-12">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left — image gallery skeleton */}
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-[var(--radius-lg)]" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-20 flex-shrink-0 rounded-[var(--radius-md)]" />
            ))}
          </div>
        </div>

        {/* Right — product details skeleton */}
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />

          <hr className="border-gray-200" />

          {/* Variant selectors */}
          <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />

          {/* Quantity + Add to cart */}
          <div className="flex gap-3">
            <Skeleton className="h-12 w-32 rounded-[var(--radius-md)]" />
            <Skeleton className="h-12 flex-1 rounded-[var(--radius-md)]" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="mt-12">
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-t-[var(--radius-md)]" />
          ))}
        </div>
        <Skeleton.Text lines={5} />
      </div>
    </Container>
  );
}
