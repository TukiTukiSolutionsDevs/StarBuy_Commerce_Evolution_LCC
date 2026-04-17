import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Fix Turbopack resolving modules from parent directory due to multiple lockfiles
  turbopack: {
    root: __dirname,
  },

  // Required for Docker deployment — generates .next/standalone with minimal runtime
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        pathname: '/**',
      },
    ],
  },

  // Disable X-Powered-By header (security)
  poweredByHeader: false,

  // Enable gzip compression at Next.js level (Nginx also compresses, but belt+suspenders)
  compress: true,

  // Required for streaming through Nginx reverse proxy (Next.js 16+ App Router)
  // Without this, Nginx buffers responses and PPR/Suspense lose their TTFB advantage
  async headers() {
    return [
      {
        source: '/:path*{/}?',
        headers: [
          {
            key: 'X-Accel-Buffering',
            value: 'no',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
