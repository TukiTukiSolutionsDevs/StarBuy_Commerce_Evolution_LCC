import Link from 'next/link';
import { AnnouncementBar } from './AnnouncementBar';
import { HeaderClient } from './HeaderClient';
import { MegaMenu } from './MegaMenu';
import type { ShopifyMenuItem } from '@/lib/shopify/types';

const NAV_ITEMS: ShopifyMenuItem[] = [
  {
    id: '1',
    title: 'Home',
    url: '/',
    type: 'HTTP',
    resourceId: null,
    tags: [],
    items: [],
  },
  {
    id: '2',
    title: 'Catalog',
    url: '/collections/all',
    type: 'COLLECTION',
    resourceId: null,
    tags: [],
    items: [],
  },
  {
    id: '3',
    title: 'Contact',
    url: '/contact',
    type: 'HTTP',
    resourceId: null,
    tags: [],
    items: [],
  },
];

export function Header() {
  return (
    <header className="fixed top-0 z-50 w-full">
      <AnnouncementBar />

      <nav
        className="bg-[#faf5f0]/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* LEFT: hamburger (mobile only) + Brand */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <HeaderClient items={NAV_ITEMS} side="left" />

              <Link
                href="/"
                className="flex items-center"
                aria-label="StarBuyBaby — Go to homepage"
              >
                <img src="/logo.png" alt="StarBuyBaby" className="h-12 md:h-14 w-auto" />
              </Link>
            </div>

            {/* CENTER: desktop navigation */}
            <MegaMenu items={NAV_ITEMS} />

            {/* RIGHT: search, account, cart */}
            <HeaderClient items={NAV_ITEMS} side="right" />
          </div>
        </div>
      </nav>
    </header>
  );
}
