import { type HTMLAttributes } from 'react';

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={[
        'animate-pulse rounded-[var(--radius-md)] bg-gray-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {/* Image */}
      <Skeleton className="aspect-square w-full rounded-[var(--radius-lg)]" />
      {/* Badge placeholder */}
      <Skeleton className="h-4 w-12" />
      {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      {/* Stars */}
      <Skeleton className="h-3 w-24" />
      {/* Price */}
      <Skeleton className="h-5 w-20" />
      {/* Button */}
      <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
    </div>
  );
}

function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={['h-4', i === lines - 1 ? 'w-3/4' : 'w-full'].join(' ')}
        />
      ))}
    </div>
  );
}

Skeleton.Product = ProductCardSkeleton;
Skeleton.ProductGrid = ProductGridSkeleton;
Skeleton.Text = TextSkeleton;

export { Skeleton };
