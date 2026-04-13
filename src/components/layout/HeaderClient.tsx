'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MobileMenu } from './MobileMenu';
import { CartCount } from './CartCount';
import { WishlistIcon } from './WishlistIcon';
import { PredictiveSearch } from '@/components/search/PredictiveSearch';
import type { ShopifyMenuItem } from '@/lib/shopify/types';

type HeaderClientProps = {
  items: ShopifyMenuItem[];
  side: 'left' | 'right';
};

export function HeaderClient({ items, side }: HeaderClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd+K / Ctrl+K keyboard shortcut to open search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (side === 'left') {
    return (
      <>
        {/* Hamburger — only on mobile */}
        <button
          aria-label="Open navigation menu"
          className="lg:hidden p-2 text-[#795a00] hover:opacity-70 rounded-xl transition-opacity duration-500 active:scale-95"
          onClick={() => setMobileOpen(true)}
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            menu
          </span>
        </button>

        {/* Mobile slide-in menu — portal */}
        <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} items={items} />
      </>
    );
  }

  // side === 'right'
  return (
    <div className="flex items-center gap-3 flex-shrink-0">
      {/* Desktop search trigger — visible on md+ */}
      <button
        onClick={() => setSearchOpen(true)}
        className="hidden md:flex items-center gap-2 bg-[#f4f4f0] rounded-xl px-4 py-1.5 text-sm w-52 lg:w-72 xl:w-80 text-[#5d605c] hover:bg-[#eeeeea] transition-all duration-500 cursor-pointer"
        aria-label="Search products"
      >
        <span
          className="material-symbols-outlined text-lg text-[#795a00] flex-shrink-0"
          aria-hidden="true"
        >
          search
        </span>
        <span className="flex-1 text-left font-body">Search products...</span>
        <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] text-[#b1b2af] bg-[#ffffff] rounded font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Mobile search button */}
      <button
        onClick={() => setSearchOpen(true)}
        className="md:hidden p-2 text-[#795a00] hover:opacity-70 rounded-xl transition-opacity duration-500 active:scale-95"
        aria-label="Search products"
      >
        <span className="material-symbols-outlined text-xl" aria-hidden="true">
          search
        </span>
      </button>

      {/* Account */}
      <Link
        href="/account"
        className="flex p-2 text-[#795a00] hover:opacity-70 rounded-xl transition-opacity duration-500 active:scale-95"
        aria-label="My account"
      >
        <span className="material-symbols-outlined text-xl" aria-hidden="true">
          person
        </span>
      </Link>

      {/* Wishlist */}
      <WishlistIcon />

      {/* Cart with badge */}
      <CartCount />

      {/* Predictive search overlay */}
      <PredictiveSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
