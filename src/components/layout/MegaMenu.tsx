'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ShopifyMenuItem } from '@/lib/shopify/types';

type MegaMenuProps = {
  items: ShopifyMenuItem[];
};

function resolveMenuUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    return url;
  }
}

export function MegaMenu({ items }: MegaMenuProps) {
  const pathname = usePathname();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleMouseEnter = useCallback((index: number) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setOpenIndex(null), 150);
  }, []);

  const handleDropdownEnter = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  return (
    <ul
      className="hidden lg:flex items-center gap-1 flex-1 justify-start pl-4"
      role="list"
      aria-label="Site navigation"
    >
      {items.map((item, index) => {
        const href = resolveMenuUrl(item.url);
        const isActive = pathname === href || pathname.startsWith(href + '/');
        const hasChildren = item.items && item.items.length > 0;
        const isOpen = openIndex === index && hasChildren;

        return (
          <li
            key={item.id}
            className="relative"
            onMouseEnter={() => (hasChildren ? handleMouseEnter(index) : setOpenIndex(null))}
            onMouseLeave={handleMouseLeave}
          >
            <Link
              href={href}
              className={`flex items-center gap-1 px-4 py-2 font-body text-sm uppercase tracking-[0.2em] transition-colors duration-500 ${
                isActive ? 'text-[#795a00] font-semibold' : 'text-[#5d605c] hover:text-[#795a00]'
              }`}
            >
              {item.title}
              {hasChildren && (
                <svg
                  className={`h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              )}
            </Link>

            {/* Dropdown panel */}
            {hasChildren && (
              <div
                onMouseEnter={handleDropdownEnter}
                onMouseLeave={handleMouseLeave}
                className={`absolute left-0 top-full pt-2 z-50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  isOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}
              >
                <div className="bg-[#ffffff] rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.04)] min-w-[220px] py-2 px-1">
                  {item.items.map((child) => {
                    const childHref = resolveMenuUrl(child.url);
                    const childActive =
                      pathname === childHref || pathname.startsWith(childHref + '/');

                    return (
                      <Link
                        key={child.id}
                        href={childHref}
                        onClick={() => setOpenIndex(null)}
                        className={`flex items-center gap-2 px-4 py-2.5 font-body text-sm rounded-xl transition-colors duration-500 ${
                          childActive
                            ? 'text-[#795a00] bg-[#f4f4f0] font-medium'
                            : 'text-[#303330] hover:text-[#795a00] hover:bg-[#f4f4f0]'
                        }`}
                      >
                        {child.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
