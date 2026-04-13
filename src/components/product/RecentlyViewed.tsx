'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getRecentlyViewed, type RecentProduct } from '@/lib/recently-viewed';

type RecentlyViewedProps = {
  currentHandle?: string;
};

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

export function RecentlyViewed({ currentHandle }: RecentlyViewedProps) {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    // Read from localStorage (async to avoid cascading render lint)
    queueMicrotask(() => {
      const recent = getRecentlyViewed().filter((item) => item.handle !== currentHandle);
      setItems(recent);
    });
  }, [currentHandle]);

  if (items.length === 0) return null;

  return (
    <section className="mb-16">
      {/* Section header */}
      <div className="flex items-center gap-4 mb-6">
        <h2 className="font-headline text-2xl text-[#303330] whitespace-nowrap">Recently Viewed</h2>
        <div className="flex-1 h-px bg-[#eeeeea]" />
      </div>

      {/* Scrollable row */}
      <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory pb-2 scrollbar-thin scrollbar-thumb-[#e1e3df] scrollbar-track-transparent">
        {items.map((item) => (
          <Link
            key={item.handle}
            href={`/products/${item.handle}`}
            className="min-w-[160px] md:min-w-[200px] flex-shrink-0 snap-start group"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-[#f4f4f0] mb-2">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="200px"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-[#b1b2af]">
                    shopping_bag
                  </span>
                </div>
              )}
            </div>
            <h3 className="font-body text-sm text-[#303330] line-clamp-2 group-hover:text-[#795a00] transition-colors">
              {item.title}
            </h3>
            <p className="text-sm font-bold text-[#795a00] mt-1">
              {formatPrice(item.price, item.currencyCode)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
