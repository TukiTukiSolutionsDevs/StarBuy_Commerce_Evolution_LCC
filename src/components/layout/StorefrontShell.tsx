'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';
import { BackToTop } from '@/components/ui/BackToTop';
import type { ReactNode } from 'react';

export function StorefrontShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Header />
      {/* pt accounts for fixed header (announcement ~36px + nav 64px) */}
      <main className="flex-1 bg-[#faf9f6] pt-[100px]">{children}</main>
      <Footer />
      <BackToTop />
    </>
  );
}
