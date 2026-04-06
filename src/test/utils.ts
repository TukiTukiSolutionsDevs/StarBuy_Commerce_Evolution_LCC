/**
 * Test utilities — mock factories using real Shopify types
 */

import type {
  ShopifyProduct,
  ShopifyCollection,
  ShopifyCart,
  ShopifyOrder,
  ShopifyMoney,
  ShopifyImage,
  ShopifyPageInfo,
} from '@/lib/shopify/types';

// ─── Primitives ────────────────────────────────────────────────────────────────

export function mockMoney(overrides?: Partial<ShopifyMoney>): ShopifyMoney {
  return {
    amount: '29.99',
    currencyCode: 'USD',
    ...overrides,
  };
}

export function mockImage(overrides?: Partial<ShopifyImage>): ShopifyImage {
  return {
    url: 'https://cdn.shopify.com/mock-image.jpg',
    altText: 'Mock product image',
    width: 800,
    height: 800,
    ...overrides,
  };
}

export function mockPageInfo(overrides?: Partial<ShopifyPageInfo>): ShopifyPageInfo {
  return {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
    ...overrides,
  };
}

// ─── Product ───────────────────────────────────────────────────────────────────

export function mockShopifyProduct(overrides?: Partial<ShopifyProduct>): ShopifyProduct {
  return {
    id: 'gid://shopify/Product/1',
    title: 'Mock Product',
    handle: 'mock-product',
    availableForSale: true,
    description: 'A great mock product',
    descriptionHtml: '<p>A great mock product</p>',
    productType: 'Apparel',
    publishedAt: '2024-01-01T00:00:00Z',
    vendor: 'Mock Brand',
    tags: ['tag1', 'tag2'],
    featuredImage: mockImage(),
    priceRange: {
      minVariantPrice: mockMoney(),
      maxVariantPrice: mockMoney({ amount: '59.99' }),
    },
    compareAtPriceRange: {
      minVariantPrice: mockMoney({ amount: '49.99' }),
    },
    images: {
      edges: [{ cursor: 'cursor-1', node: mockImage() }],
      pageInfo: mockPageInfo(),
    },
    options: [
      {
        id: 'gid://shopify/ProductOption/1',
        name: 'Size',
        values: ['S', 'M', 'L'],
      },
    ],
    variants: {
      edges: [
        {
          cursor: 'cursor-v1',
          node: {
            id: 'gid://shopify/ProductVariant/1',
            title: 'S',
            availableForSale: true,
            quantityAvailable: 10,
            selectedOptions: [{ name: 'Size', value: 'S' }],
            price: mockMoney(),
            compareAtPrice: null,
            image: mockImage(),
          },
        },
      ],
      pageInfo: mockPageInfo(),
    },
    seo: {
      title: 'Mock Product | Store',
      description: 'Buy mock product now',
    },
    ...overrides,
  };
}

// ─── Collection ────────────────────────────────────────────────────────────────

export function mockShopifyCollection(overrides?: Partial<ShopifyCollection>): ShopifyCollection {
  return {
    id: 'gid://shopify/Collection/1',
    title: 'Mock Collection',
    handle: 'mock-collection',
    description: 'A mock collection of products',
    descriptionHtml: '<p>A mock collection of products</p>',
    image: mockImage(),
    seo: {
      title: 'Mock Collection | Store',
      description: 'Browse our mock collection',
    },
    products: {
      edges: [],
      filters: [],
      pageInfo: mockPageInfo(),
    },
    ...overrides,
  };
}

// ─── Cart ──────────────────────────────────────────────────────────────────────

export function mockShopifyCart(overrides?: Partial<ShopifyCart>): ShopifyCart {
  return {
    id: 'gid://shopify/Cart/1',
    checkoutUrl: 'https://mock-store.myshopify.com/checkout/1',
    totalQuantity: 1,
    lines: {
      edges: [
        {
          node: {
            id: 'gid://shopify/CartLine/1',
            quantity: 1,
            merchandise: {
              id: 'gid://shopify/ProductVariant/1',
              title: 'S',
              selectedOptions: [{ name: 'Size', value: 'S' }],
              price: mockMoney(),
              compareAtPrice: null,
              image: mockImage(),
              product: {
                id: 'gid://shopify/Product/1',
                title: 'Mock Product',
                handle: 'mock-product',
                featuredImage: mockImage(),
              },
            },
            cost: {
              totalAmount: mockMoney(),
              subtotalAmount: mockMoney(),
            },
          },
        },
      ],
    },
    cost: {
      subtotalAmount: mockMoney(),
      totalAmount: mockMoney(),
      totalTaxAmount: null,
      totalDutyAmount: null,
    },
    note: null,
    attributes: [],
    ...overrides,
  };
}

// ─── Order (for admin) ─────────────────────────────────────────────────────────

export function mockShopifyOrder(overrides?: Partial<ShopifyOrder>): ShopifyOrder {
  return {
    id: 'gid://shopify/Order/1',
    orderNumber: 1001,
    processedAt: '2024-01-15T10:00:00Z',
    financialStatus: 'PAID',
    fulfillmentStatus: 'FULFILLED',
    currentTotalPrice: mockMoney({ amount: '29.99' }),
    lineItems: {
      edges: [
        {
          node: {
            title: 'Mock Product - S',
            quantity: 1,
            variant: {
              image: mockImage(),
              price: mockMoney(),
            },
          },
        },
      ],
    },
    ...overrides,
  };
}
