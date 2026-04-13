import type { Metadata } from 'next';
import { Noto_Serif, Manrope } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { StorefrontShell } from '@/components/layout/StorefrontShell';
import type { ReactNode } from 'react';

// ── Fonts ──────────────────────────────────────────────────────────────────────

const notoSerif = Noto_Serif({
  variable: '--font-headline-loaded',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700', '900'],
});

const manrope = Manrope({
  variable: '--font-body-loaded',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'StarBuyBaby — Curated Essentials for Modern Living',
    template: '%s | StarBuyBaby',
  },
  description:
    'Shop curated essentials, trending products, and premium finds at StarBuyBaby. Fast shipping, 30-day returns, and unbeatable quality.',
  keywords: ['ecommerce', 'online shop', 'trending products', 'best prices', 'starbuybaby'],
  authors: [{ name: 'StarBuyBaby' }],
  creator: 'StarBuyBaby',
  publisher: 'StarBuyBaby',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://starbuybaby.com',
    siteName: 'StarBuyBaby',
    title: 'StarBuyBaby — Curated Essentials for Modern Living',
    description: 'Shop curated essentials, trending products, and premium finds at StarBuyBaby.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StarBuyBaby — Curated Essentials for Modern Living',
    description: 'Shop curated essentials, trending products, and premium finds at StarBuyBaby.',
  },
};

// ── Layout ────────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${notoSerif.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#faf9f6] text-[#303330] font-body">
        {/*
          Material Symbols Outlined font for icons.
          Placed as a script-safe inline link — App Router layouts can include arbitrary JSX in body.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        <Providers>
          <StorefrontShell>{children}</StorefrontShell>
        </Providers>
      </body>
    </html>
  );
}
