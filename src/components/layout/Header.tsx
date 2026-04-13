import Link from 'next/link';
import { getMenu } from '@/lib/shopify';
import { AnnouncementBar } from './AnnouncementBar';
import { HeaderClient } from './HeaderClient';
import { MegaMenu } from './MegaMenu';
import type { ShopifyMenuItem } from '@/lib/shopify/types';

const FALLBACK_NAV: ShopifyMenuItem[] = [
  {
    id: '1',
    title: 'New Arrivals',
    url: '/collections/new-arrivals',
    type: 'COLLECTION',
    resourceId: null,
    tags: [],
    items: [],
  },
  {
    id: '2',
    title: 'Trending',
    url: '/collections/trending',
    type: 'COLLECTION',
    resourceId: null,
    tags: [],
    items: [],
  },
  {
    id: '3',
    title: 'Electronics',
    url: '/collections/electronics',
    type: 'COLLECTION',
    resourceId: null,
    tags: [],
    items: [],
  },
  {
    id: '4',
    title: 'Home & Garden',
    url: '/collections/home-garden',
    type: 'COLLECTION',
    resourceId: null,
    tags: [],
    items: [],
  },
  {
    id: '5',
    title: 'Deals',
    url: '/collections/deals',
    type: 'COLLECTION',
    resourceId: null,
    tags: [],
    items: [],
  },
];

export async function Header() {
  let navItems: ShopifyMenuItem[] = FALLBACK_NAV;

  try {
    const menu = await getMenu('main-menu');
    if (menu?.items && menu.items.length > 0) {
      navItems = menu.items;
    }
  } catch {
    // Use fallback during development when Shopify is not yet configured
  }

  return (
    <header className="fixed top-0 z-50 w-full">
      <AnnouncementBar />

      <nav
        className="bg-[#faf9f6]/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* LEFT: hamburger (mobile only) + Brand */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Hamburger + mobile menu — rendered in HeaderClient */}
              <HeaderClient items={navItems} side="left" />

              <Link
                href="/"
                className="flex items-center"
                aria-label="StarBuyBaby — Go to homepage"
              >
                <span className="font-headline font-black text-2xl tracking-widest text-[#795a00]">
                  STARBUYBABY
                </span>
              </Link>
            </div>

            {/* CENTER: desktop navigation with mega menu */}
            <MegaMenu items={navItems} />

            {/* RIGHT: search, account, cart + mobile menu portal */}
            <HeaderClient items={navItems} side="right" />
          </div>
        </div>
      </nav>
    </header>
  );
}
