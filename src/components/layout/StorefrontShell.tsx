'use client';

import { Suspense } from 'react';
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
      <Suspense fallback={<div className="h-[100px]" />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-[#faf5f0] pt-[92px] md:pt-[100px]">{children}</main>
      <Footer />
      <BackToTop />
    </>
  );
}
