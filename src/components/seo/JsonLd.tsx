// JSON-LD structured data components for SEO
// These render <script type="application/ld+json"> tags in the <head> via Next.js metadata API,
// but since we can't inject arbitrary scripts via metadata, we render them as DOM <script> elements.

import type { ShopifyProduct } from '@/lib/shopify/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://starbuy.com';
const SITE_NAME = 'Starbuy';

// ─── Generic JSON-LD wrapper ───────────────────────────────────────────────────

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint: intentional
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ─── Product Schema ───────────────────────────────────────────────────────────

type ProductJsonLdProps = {
  product: ShopifyProduct;
};

export function ProductJsonLd({ product }: ProductJsonLdProps) {
  const price = product.priceRange.minVariantPrice;
  const availability = product.availableForSale
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  const image = product.featuredImage?.url
    ? [product.featuredImage.url]
    : product.images.edges.slice(0, 3).map((e) => e.node.url);

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.title,
    description: product.description || product.seo?.description || '',
    image,
    brand: {
      '@type': 'Brand',
      name: product.vendor || SITE_NAME,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: price.currencyCode,
      price: parseFloat(price.amount).toFixed(2),
      availability,
      url: `${SITE_URL}/products/${product.handle}`,
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
    url: `${SITE_URL}/products/${product.handle}`,
  };

  return <JsonLdScript data={data} />;
}

// ─── Breadcrumb Schema ────────────────────────────────────────────────────────

type BreadcrumbItem = {
  name: string;
  url: string;
};

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };

  return <JsonLdScript data={data} />;
}

// ─── Organization Schema ──────────────────────────────────────────────────────

export function OrganizationJsonLd() {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    legalName: 'Starbuy Commerce Revolution LLC',
    url: SITE_URL,
    logo: `${SITE_URL}/og-image.png`,
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@starbuy.com',
      contactType: 'customer service',
      availableLanguage: 'English',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Arlington',
      addressRegion: 'Virginia',
      addressCountry: 'US',
    },
  };

  return <JsonLdScript data={data} />;
}

// ─── WebSite + SearchAction Schema ────────────────────────────────────────────

export function WebSiteJsonLd() {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return <JsonLdScript data={data} />;
}
