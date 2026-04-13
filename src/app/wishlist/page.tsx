'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { getWishlist, removeFromWishlist, clearWishlist, type WishlistItem } from '@/lib/wishlist';
import { RecentlyViewed } from '@/components/product/RecentlyViewed';

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    queueMicrotask(() => setItems(getWishlist()));

    function handleChange() {
      setItems(getWishlist());
    }
    window.addEventListener('starbuy:wishlist-change', handleChange);
    return () => window.removeEventListener('starbuy:wishlist-change', handleChange);
  }, []);

  function handleRemove(productId: string) {
    removeFromWishlist(productId);
    setItems(getWishlist());
  }

  function handleClearAll() {
    clearWishlist();
    setItems([]);
  }

  return (
    <Container as="main" className="py-8 sm:py-12 bg-[#faf9f6]">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-[#5d605c]">
          <li>
            <Link href="/" className="hover:text-[#795a00] transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <span className="material-symbols-outlined text-sm text-[#b1b2af]">chevron_right</span>
          </li>
          <li className="text-[#303330] font-medium">Wishlist</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline text-4xl text-[#303330]">My Wishlist</h1>
          {items.length > 0 && (
            <p className="font-label text-xs uppercase tracking-widest text-[#5d605c] mt-2">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-sm font-medium text-[#795a00] hover:text-[#6b4f00] transition-colors"
          >
            <span className="material-symbols-outlined text-base">delete_sweep</span>
            Clear All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
          <svg
            className="h-24 w-24 text-[#e1e3df]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={0.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          <div>
            <h2 className="font-headline text-2xl text-[#303330] mb-2">Your wishlist is empty</h2>
            <p className="text-[#5d605c] mb-6">
              Save items you love to your wishlist and come back to them later.
            </p>
          </div>
          <Link
            href="/collections/all"
            className="inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-bold tracking-widest text-[#fff8f0] transition-all duration-500 hover:shadow-[0_0_20px_rgba(121,90,0,0.3)]"
            style={{
              background: 'radial-gradient(circle at center, #f8cc69 0%, #795a00 100%)',
            }}
          >
            <span className="material-symbols-outlined text-base">storefront</span>
            Start Browsing
          </Link>
        </div>
      ) : (
        /* Grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl bg-[#ffffff] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)] transition-all duration-500"
            >
              {/* Image */}
              <Link
                href={`/products/${item.handle}`}
                className="relative block aspect-square bg-[#f4f4f0]"
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-[#b1b2af]">
                      shopping_bag
                    </span>
                  </div>
                )}
              </Link>

              {/* Details */}
              <div className="p-4">
                <Link href={`/products/${item.handle}`}>
                  <h3 className="font-body font-bold text-[#303330] line-clamp-2 mb-1 hover:text-[#795a00] transition-colors text-sm">
                    {item.title}
                  </h3>
                </Link>
                <p className="text-lg font-bold text-[#795a00] mb-3">
                  {formatPrice(item.price, item.currencyCode)}
                </p>

                <div className="flex gap-2">
                  {/* View Product */}
                  <Link
                    href={`/products/${item.handle}`}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold text-[#fff8f0] transition-all duration-500 hover:shadow-[0_0_16px_rgba(121,90,0,0.3)]"
                    style={{
                      background: 'radial-gradient(circle at center, #f8cc69 0%, #795a00 100%)',
                    }}
                  >
                    <span className="material-symbols-outlined text-base">shopping_cart</span>
                    View
                  </Link>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="flex items-center justify-center h-9 w-9 rounded-lg bg-[#f4f4f0] text-[#b1b2af] hover:text-[#795a00] hover:bg-[#f8cc69]/20 transition-colors"
                    aria-label={`Remove ${item.title} from wishlist`}
                    title="Remove from wishlist"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recently Viewed */}
      <RecentlyViewed />
    </Container>
  );
}
