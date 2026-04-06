/**
 * Web App Manifest — PWA support
 *
 * Enables "Add to Home Screen" on mobile devices.
 * Uses the StarBuy brand colors and the existing logo.
 */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Starbuy — Trending Products at Unbeatable Prices',
    short_name: 'Starbuy',
    description: 'Shop trending products, electronics, fashion, and more.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0f1e',
    theme_color: '#d4a843',
    icons: [
      {
        src: '/StarBuy.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/StarBuy.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
