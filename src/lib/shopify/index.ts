import { shopifyFetch } from './client';
import { DEFAULT_REVALIDATE } from './constants';

import { PRODUCTS_QUERY, PRODUCT_BY_HANDLE_QUERY, PRODUCT_RECOMMENDATIONS_QUERY } from './queries/products';
import { COLLECTIONS_QUERY, COLLECTION_BY_HANDLE_QUERY } from './queries/collections';
import { PREDICTIVE_SEARCH_QUERY } from './queries/search';
import { SHOP_QUERY, MENU_QUERY, POLICIES_QUERY, PAGES_QUERY, PAGE_BY_HANDLE_QUERY } from './queries/shop';
import { CUSTOMER_QUERY } from './queries/customer';

import type {
  ShopifyProduct,
  ShopifyProductCard,
  ShopifyCollection,
  ShopifyCart,
  ShopifyCustomer,
  ShopifyMenu,
  ShopifyPage,
  PredictiveSearchResult,
} from './types';

// ─── Products ─────────────────────────────────────────────────────────────────

type ProductsOptions = {
  sortKey?: string;
  reverse?: boolean;
  first?: number;
  query?: string;
};

type ProductsQueryResult = {
  products: {
    edges: Array<{ cursor: string; node: ShopifyProductCard }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: string | null;
      endCursor?: string | null;
    };
  };
};

export async function getProducts(options: ProductsOptions = {}): Promise<ShopifyProductCard[]> {
  const { sortKey = 'RELEVANCE', reverse = false, first = 20, query } = options;
  const data = await shopifyFetch<ProductsQueryResult>({
    query: PRODUCTS_QUERY,
    variables: { sortKey, reverse, first, query },
    revalidate: DEFAULT_REVALIDATE.home,
    tags: ['shopify', 'products'],
  });
  return data.products.edges.map((e) => e.node);
}

type ProductQueryResult = {
  product: ShopifyProduct | null;
};

export async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const data = await shopifyFetch<ProductQueryResult>({
    query: PRODUCT_BY_HANDLE_QUERY,
    variables: { handle },
    revalidate: DEFAULT_REVALIDATE.product,
    tags: ['shopify', 'products', `product-${handle}`],
  });
  return data.product;
}

type ProductRecommendationsQueryResult = {
  productRecommendations: ShopifyProductCard[];
};

export async function getProductRecommendations(productId: string): Promise<ShopifyProductCard[]> {
  const data = await shopifyFetch<ProductRecommendationsQueryResult>({
    query: PRODUCT_RECOMMENDATIONS_QUERY,
    variables: { productId },
    revalidate: DEFAULT_REVALIDATE.product,
    tags: ['shopify', 'products'],
  });
  return data.productRecommendations ?? [];
}

// ─── Collections ──────────────────────────────────────────────────────────────

type CollectionsQueryResult = {
  collections: {
    edges: Array<{ cursor: string; node: ShopifyCollection }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string | null;
    };
  };
};

export async function getCollections(first = 20): Promise<ShopifyCollection[]> {
  const data = await shopifyFetch<CollectionsQueryResult>({
    query: COLLECTIONS_QUERY,
    variables: { first },
    revalidate: DEFAULT_REVALIDATE.collection,
    tags: ['shopify', 'collections'],
  });
  return data.collections.edges.map((e) => e.node);
}

type CollectionQueryResult = {
  collection: ShopifyCollection | null;
};

type CollectionOptions = {
  first?: number;
  after?: string;
  sortKey?: string;
  reverse?: boolean;
  filters?: Record<string, unknown>[];
};

export async function getCollectionByHandle(
  handle: string,
  options: CollectionOptions = {}
): Promise<ShopifyCollection | null> {
  const { first = 24, after, sortKey = 'MANUAL', reverse = false, filters } = options;
  const data = await shopifyFetch<CollectionQueryResult>({
    query: COLLECTION_BY_HANDLE_QUERY,
    variables: { handle, first, after, sortKey, reverse, filters },
    revalidate: DEFAULT_REVALIDATE.collection,
    tags: ['shopify', 'collections', `collection-${handle}`],
  });
  return data.collection;
}

// ─── Search ───────────────────────────────────────────────────────────────────

type PredictiveSearchQueryResult = {
  predictiveSearch: PredictiveSearchResult;
};

export async function predictiveSearch(query: string): Promise<PredictiveSearchResult> {
  const data = await shopifyFetch<PredictiveSearchQueryResult>({
    query: PREDICTIVE_SEARCH_QUERY,
    variables: { query, limit: 10 },
    revalidate: DEFAULT_REVALIDATE.search,
  });
  return data.predictiveSearch;
}

// ─── Shop ─────────────────────────────────────────────────────────────────────

type ShopQueryResult = {
  shop: {
    id: string;
    name: string;
    description: string;
    primaryDomain: { url: string; host: string };
    brand?: {
      logo?: { image: { url: string; altText: string | null; width: number | null; height: number | null } };
      squareLogo?: { image: { url: string; altText: string | null; width: number | null; height: number | null } };
      colors?: {
        primary?: { foreground: string; background: string }[];
        secondary?: { foreground: string; background: string }[];
      };
    };
    paymentSettings: {
      acceptedCardBrands: string[];
      countryCode: string;
      currencyCode: string;
      enabledPresentmentCurrencies: string[];
    };
  };
};

export async function getShopInfo(): Promise<ShopQueryResult['shop']> {
  const data = await shopifyFetch<ShopQueryResult>({
    query: SHOP_QUERY,
    revalidate: DEFAULT_REVALIDATE.pages,
    tags: ['shopify', 'shop'],
  });
  return data.shop;
}

type MenuQueryResult = {
  menu: ShopifyMenu | null;
};

export async function getMenu(handle: string): Promise<ShopifyMenu | null> {
  const data = await shopifyFetch<MenuQueryResult>({
    query: MENU_QUERY,
    variables: { handle },
    revalidate: DEFAULT_REVALIDATE.pages,
    tags: ['shopify', 'menu', `menu-${handle}`],
  });
  return data.menu;
}

type PoliciesQueryResult = {
  shop: {
    privacyPolicy: {
      id: string;
      title: string;
      handle: string;
      body: string;
      url: string;
    } | null;
    refundPolicy: {
      id: string;
      title: string;
      handle: string;
      body: string;
      url: string;
    } | null;
    shippingPolicy: {
      id: string;
      title: string;
      handle: string;
      body: string;
      url: string;
    } | null;
    termsOfService: {
      id: string;
      title: string;
      handle: string;
      body: string;
      url: string;
    } | null;
  };
};

export async function getShopPolicies(): Promise<PoliciesQueryResult['shop']> {
  const data = await shopifyFetch<PoliciesQueryResult>({
    query: POLICIES_QUERY,
    revalidate: DEFAULT_REVALIDATE.policies,
    tags: ['shopify', 'policies'],
  });
  return data.shop;
}

type PagesQueryResult = {
  pages: {
    edges: Array<{ node: ShopifyPage }>;
  };
};

export async function getPages(): Promise<ShopifyPage[]> {
  const data = await shopifyFetch<PagesQueryResult>({
    query: PAGES_QUERY,
    revalidate: DEFAULT_REVALIDATE.pages,
    tags: ['shopify', 'pages'],
  });
  return data.pages.edges.map((e) => e.node);
}

type PageQueryResult = {
  page: ShopifyPage | null;
};

export async function getPageByHandle(handle: string): Promise<ShopifyPage | null> {
  const data = await shopifyFetch<PageQueryResult>({
    query: PAGE_BY_HANDLE_QUERY,
    variables: { handle },
    revalidate: DEFAULT_REVALIDATE.pages,
    tags: ['shopify', 'pages', `page-${handle}`],
  });
  return data.page;
}

// ─── Customer ─────────────────────────────────────────────────────────────────

type CustomerQueryResult = {
  customer: ShopifyCustomer | null;
};

export async function getCustomer(accessToken: string): Promise<ShopifyCustomer | null> {
  const data = await shopifyFetch<CustomerQueryResult>({
    query: CUSTOMER_QUERY,
    variables: { customerAccessToken: accessToken },
    revalidate: 0, // Always fresh — customer data
    tags: ['shopify', 'customer'],
  });
  return data.customer;
}

// ─── Cart helpers (mutations are called from Server Actions or API routes) ────

export type { ShopifyCart };
