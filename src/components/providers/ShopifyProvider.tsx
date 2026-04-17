'use client';

import { ShopifyProvider as HydrogenShopifyProvider } from '@shopify/hydrogen-react';

type ShopifyProviderProps = {
  children: React.ReactNode;
};

export function ShopifyProvider({ children }: ShopifyProviderProps) {
  const storeDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const storefrontToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;

  // During build/prerender without env vars, render children without provider
  if (!storeDomain || !storefrontToken) {
    return <>{children}</>;
  }

  return (
    <HydrogenShopifyProvider
      storeDomain={`https://${storeDomain}`}
      storefrontToken={storefrontToken}
      storefrontApiVersion="2026-01"
      countryIsoCode="US"
      languageIsoCode="EN"
    >
      {children}
    </HydrogenShopifyProvider>
  );
}
