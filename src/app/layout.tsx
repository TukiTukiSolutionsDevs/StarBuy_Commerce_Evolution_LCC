import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { StorefrontShell } from '@/components/layout/StorefrontShell';
import type { ReactNode } from 'react';

// ── Fonts ──────────────────────────────────────────────────────────────────────

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-heading-loaded',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const inter = Inter({
  variable: '--font-body-loaded',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'Starbuy — Trending Products at Unbeatable Prices',
    template: '%s | Starbuy',
  },
  description:
    'Shop trending products, electronics, fashion, and more at Starbuy. Fast shipping, 30-day returns, and unbeatable prices.',
  keywords: ['ecommerce', 'online shop', 'trending products', 'best prices', 'starbuy'],
  authors: [{ name: 'Starbuy Commerce' }],
  creator: 'Starbuy Commerce Revolution LLC',
  publisher: 'Starbuy Commerce Revolution LLC',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://starbuy.com',
    siteName: 'Starbuy',
    title: 'Starbuy — Trending Products at Unbeatable Prices',
    description:
      'Shop trending products, electronics, fashion, and more at Starbuy.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Starbuy — Trending Products at Unbeatable Prices',
    description:
      'Shop trending products, electronics, fashion, and more at Starbuy.',
  },
};

// ── Layout ────────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--color-surface)] text-[var(--color-text-primary)]">
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
