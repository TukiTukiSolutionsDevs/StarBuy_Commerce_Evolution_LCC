'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type NavLinkProps = {
  href: string;
  children: ReactNode;
};

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`px-4 py-2 text-sm font-medium transition-colors duration-150 ${
        isActive
          ? 'text-[#795a00] border-b-2 border-[#795a00] pb-1 font-semibold'
          : 'text-[#5d605c] hover:text-[#795a00] hover:bg-[#f4f4f0] rounded-md'
      }`}
    >
      {children}
    </Link>
  );
}
