'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';
import { BackToTop } from '@/components/ui/BackToTop';
import { StarfieldBackground } from '@/components/storefront/StarfieldBackground';
import type { ReactNode } from 'react';

export function StorefrontShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      {/*
        Fondo ambiental de estrellas (solo storefront).
        Fixed al viewport → persiste en scroll.
        Renderizado antes del contenido para que quede detrás.
      */}
      <StarfieldBackground />
      <Suspense fallback={<div className="h-[100px]" />}>
        <Header />
      </Suspense>
      {/*
        NOTA: se removió `bg-[#faf5f0]` para que el fondo sólido no tape
        al StarfieldBackground. El <body> ya provee ese mismo color de fondo.
      */}
      <main className="flex-1 pt-[92px] md:pt-[100px] relative">{children}</main>
      <Footer />
      <BackToTop />
    </>
  );
}
