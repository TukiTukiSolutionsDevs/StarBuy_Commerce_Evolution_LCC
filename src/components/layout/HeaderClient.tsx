'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileMenu } from './MobileMenu';
import { CartCount } from './CartCount';
import type { ShopifyMenuItem } from '@/lib/shopify/types';

type HeaderClientProps = {
  items: ShopifyMenuItem[];
  side: 'left' | 'right';
};

export function HeaderClient({ items, side }: HeaderClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setSearchQuery('');
  }

  if (side === 'left') {
    return (
      <>
        {/* Hamburger — only on mobile */}
        <button
          aria-label="Open navigation menu"
          className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors active:scale-95"
          onClick={() => setMobileOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>

        {/* Mobile slide-in menu — portal */}
        <MobileMenu
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          items={items}
        />
      </>
    );
  }

  // side === 'right'
  return (
    <div className="flex items-center gap-3 flex-shrink-0">
      {/* Inline search — visible on md+ */}
      <form
        onSubmit={handleSearchSubmit}
        className="hidden md:flex relative items-center"
      >
        <input
          ref={searchInputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products..."
          className="bg-gray-100 border border-gray-200 rounded-full px-4 py-1.5 text-sm w-52 lg:w-64 focus:ring-1 focus:ring-[#D4A843] text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white transition-all"
          aria-label="Search products"
        />
        <button
          type="submit"
          className="absolute right-3 text-gray-400 hover:text-[#1B2A5E] transition-colors"
          aria-label="Submit search"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">search</span>
        </button>
      </form>

      {/* Mobile search button */}
      <button
        onClick={() => {
          router.push('/search');
        }}
        className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors active:scale-95"
        aria-label="Search products"
      >
        <span className="material-symbols-outlined text-xl" aria-hidden="true">search</span>
      </button>

      {/* Account */}
      <Link
        href="/account"
        className="hidden sm:flex p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors active:scale-95"
        aria-label="My account"
      >
        <span className="material-symbols-outlined text-xl" aria-hidden="true">person</span>
      </Link>

      {/* Cart with badge */}
      <CartCount />
    </div>
  );
}
