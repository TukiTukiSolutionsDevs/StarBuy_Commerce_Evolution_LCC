'use client';

export function ProductCardSkeleton() {
  return (
    <div className="bg-[#ffffff] rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-[#eeeeea]" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-[#e8e8e4] rounded w-1/3" />
        <div className="h-4 bg-[#e8e8e4] rounded w-3/4" />
        <div className="h-5 bg-[#e8e8e4] rounded w-1/3" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CollectionPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#faf9f6] px-4 md:px-8 py-8 animate-pulse">
      <div className="max-w-7xl mx-auto">
        <div className="h-8 bg-[#e8e8e4] rounded w-1/3 mb-4" />
        <div className="h-4 bg-[#e8e8e4] rounded w-2/3 mb-8" />
        <ProductGridSkeleton />
      </div>
    </div>
  );
}

export function ProductPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#faf9f6] px-4 md:px-8 py-8 animate-pulse">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="aspect-square bg-[#eeeeea] rounded-2xl" />
        <div className="space-y-4">
          <div className="h-8 bg-[#e8e8e4] rounded w-3/4" />
          <div className="h-6 bg-[#e8e8e4] rounded w-1/4" />
          <div className="h-4 bg-[#e8e8e4] rounded w-full" />
          <div className="h-4 bg-[#e8e8e4] rounded w-5/6" />
          <div className="h-4 bg-[#e8e8e4] rounded w-2/3" />
          <div className="h-12 bg-[#e8e8e4] rounded w-full mt-8" />
        </div>
      </div>
    </div>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="min-h-screen bg-[#faf9f6] px-4 md:px-8 py-8 animate-pulse">
      <div className="max-w-7xl mx-auto">
        <div className="h-12 bg-[#e8e8e4] rounded-lg w-full max-w-xl mb-8" />
        <div className="h-6 bg-[#e8e8e4] rounded w-1/4 mb-6" />
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
