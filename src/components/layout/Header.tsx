import Link from 'next/link';
import Image from 'next/image';
import { getMenu } from '@/lib/shopify';
import { AnnouncementBar } from './AnnouncementBar';
import { HeaderClient } from './HeaderClient';
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

function resolveMenuUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    return url;
  }
}

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
    <header className="sticky top-0 z-50 w-full">
      <AnnouncementBar />

      <nav className="bg-white shadow-md border-b border-gray-200" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* LEFT: hamburger (mobile only) + Logo */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Hamburger + mobile menu — rendered in HeaderClient */}
              <HeaderClient items={navItems} side="left" />

              <Link href="/" className="flex items-center" aria-label="Starbuy — Go to homepage">
                <Image
                  src="/StarBuy.png"
                  alt="StarBuy"
                  width={60}
                  height={40}
                  className="h-10 w-auto"
                  priority
                />
              </Link>
            </div>

            {/* CENTER: desktop navigation links */}
            <ul
              className="hidden lg:flex items-center gap-1 flex-1 justify-start pl-4"
              role="list"
              aria-label="Site navigation"
            >
              {navItems.map((item, idx) => (
                <li key={item.id}>
                  <Link
                    href={resolveMenuUrl(item.url)}
                    className={`px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                      idx === 0
                        ? 'text-[#1B2A5E] border-b-2 border-[#D4A843] pb-1 font-semibold'
                        : 'text-gray-600 hover:text-[#1B2A5E] hover:bg-gray-100 rounded-md'
                    }`}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>

            {/* RIGHT: search, account, cart + mobile menu portal */}
            <HeaderClient items={navItems} side="right" />
          </div>
        </div>
      </nav>
    </header>
  );
}
