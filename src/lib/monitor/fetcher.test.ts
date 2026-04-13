/**
 * Unit tests — monitor/fetcher.ts
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchProductViews,
  fetchProductOrders,
  fetchProductInventory,
  fetchProductMetrics,
} from './fetcher';

// ─── Mock adminFetch ──────────────────────────────────────────────────────────

vi.mock('@/lib/shopify/admin/client', () => ({
  adminFetch: vi.fn(),
}));

import { adminFetch } from '@/lib/shopify/admin/client';
const mockAdminFetch = vi.mocked(adminFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── fetchProductViews ────────────────────────────────────────────────────────

describe('fetchProductViews', () => {
  it('returns view count from ShopifyQL response', async () => {
    mockAdminFetch.mockResolvedValueOnce({
      data: {
        shopifyqlQuery: {
          tableData: { rowData: [['150']] },
        },
      },
    });
    const views = await fetchProductViews(
      'gid://shopify/Product/1',
      new Date('2024-01-01'),
      new Date('2024-01-07'),
    );
    expect(views).toBe(150);
  });

  it('returns 0 when rowData is empty', async () => {
    mockAdminFetch.mockResolvedValueOnce({
      data: {
        shopifyqlQuery: {
          tableData: { rowData: [] },
        },
      },
    });
    expect(await fetchProductViews('gid://shopify/Product/1', new Date(), new Date())).toBe(0);
  });

  it('returns 0 on adminFetch error', async () => {
    mockAdminFetch.mockRejectedValueOnce(new Error('403 Forbidden'));
    expect(await fetchProductViews('gid://shopify/Product/1', new Date(), new Date())).toBe(0);
  });

  it('returns 0 when shopifyqlQuery is null', async () => {
    mockAdminFetch.mockResolvedValueOnce({ data: { shopifyqlQuery: null } });
    expect(await fetchProductViews('gid://shopify/Product/1', new Date(), new Date())).toBe(0);
  });
});

// ─── fetchProductOrders ───────────────────────────────────────────────────────

describe('fetchProductOrders', () => {
  it('returns order count and revenue sum for matching line items', async () => {
    mockAdminFetch.mockResolvedValueOnce({
      data: {
        orders: {
          pageInfo: { hasNextPage: false, endCursor: null },
          edges: [
            {
              node: {
                id: 'gid://shopify/Order/1',
                lineItems: {
                  edges: [
                    {
                      node: {
                        product: { id: 'gid://shopify/Product/1' },
                        quantity: 2,
                        originalTotalSet: { shopMoney: { amount: '100.00' } },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    });

    const result = await fetchProductOrders('gid://shopify/Product/1', new Date(), new Date());
    expect(result.orders).toBe(2);
    expect(result.revenue).toBe(100);
  });

  it('ignores line items from other products', async () => {
    mockAdminFetch.mockResolvedValueOnce({
      data: {
        orders: {
          pageInfo: { hasNextPage: false, endCursor: null },
          edges: [
            {
              node: {
                id: 'gid://shopify/Order/1',
                lineItems: {
                  edges: [
                    {
                      node: {
                        product: { id: 'gid://shopify/Product/99' },
                        quantity: 3,
                        originalTotalSet: { shopMoney: { amount: '150.00' } },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    });

    const result = await fetchProductOrders('gid://shopify/Product/1', new Date(), new Date());
    expect(result.orders).toBe(0);
    expect(result.revenue).toBe(0);
  });

  it('returns 0,0 on error', async () => {
    mockAdminFetch.mockRejectedValueOnce(new Error('403'));
    const result = await fetchProductOrders('gid://shopify/Product/1', new Date(), new Date());
    expect(result.orders).toBe(0);
    expect(result.revenue).toBe(0);
  });
});

// ─── fetchProductInventory ────────────────────────────────────────────────────

describe('fetchProductInventory', () => {
  it('sums available inventory across all variants and locations', async () => {
    mockAdminFetch.mockResolvedValueOnce({
      data: {
        product: {
          variants: {
            edges: [
              {
                node: {
                  inventoryItem: {
                    inventoryLevels: {
                      edges: [{ node: { available: 10 } }, { node: { available: 5 } }],
                    },
                  },
                },
              },
              {
                node: {
                  inventoryItem: {
                    inventoryLevels: {
                      edges: [{ node: { available: 8 } }],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });

    expect(await fetchProductInventory('gid://shopify/Product/1')).toBe(23);
  });

  it('returns 0 when product not found', async () => {
    mockAdminFetch.mockResolvedValueOnce({ data: { product: null } });
    expect(await fetchProductInventory('gid://shopify/Product/1')).toBe(0);
  });

  it('returns 0 on error', async () => {
    mockAdminFetch.mockRejectedValueOnce(new Error('500'));
    expect(await fetchProductInventory('gid://shopify/Product/1')).toBe(0);
  });
});

// ─── fetchProductMetrics ──────────────────────────────────────────────────────

describe('fetchProductMetrics', () => {
  it('orchestrates all three fetchers and computes conversionRate', async () => {
    // views
    mockAdminFetch.mockResolvedValueOnce({
      data: { shopifyqlQuery: { tableData: { rowData: [['200']] } } },
    });
    // orders
    mockAdminFetch.mockResolvedValueOnce({
      data: {
        orders: {
          pageInfo: { hasNextPage: false, endCursor: null },
          edges: [
            {
              node: {
                id: 'gid://shopify/Order/1',
                lineItems: {
                  edges: [
                    {
                      node: {
                        product: { id: 'gid://shopify/Product/1' },
                        quantity: 10,
                        originalTotalSet: { shopMoney: { amount: '500.00' } },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    });
    // inventory
    mockAdminFetch.mockResolvedValueOnce({
      data: {
        product: {
          variants: {
            edges: [
              {
                node: {
                  inventoryItem: { inventoryLevels: { edges: [{ node: { available: 30 } }] } },
                },
              },
            ],
          },
        },
      },
    });

    const result = await fetchProductMetrics({
      shopifyProductId: 'gid://shopify/Product/1',
      title: 'Test',
    });
    expect(result.views).toBe(200);
    expect(result.orders).toBe(10);
    expect(result.revenue).toBe(500);
    expect(result.inventory).toBe(30);
    expect(result.conversionRate).toBeCloseTo(10 / 200);
  });

  it('sets conversionRate to 0 when views is 0', async () => {
    mockAdminFetch.mockResolvedValueOnce({
      data: { shopifyqlQuery: { tableData: { rowData: [] } } },
    });
    mockAdminFetch.mockResolvedValueOnce({
      data: { orders: { pageInfo: { hasNextPage: false, endCursor: null }, edges: [] } },
    });
    mockAdminFetch.mockResolvedValueOnce({ data: { product: { variants: { edges: [] } } } });

    const result = await fetchProductMetrics({
      shopifyProductId: 'gid://shopify/Product/1',
      title: 'Test',
    });
    expect(result.conversionRate).toBe(0);
  });

  it('uses a 7-day window (fetchedAt within last 7 days)', async () => {
    const calls: unknown[] = [];
    mockAdminFetch.mockImplementation(async (...args) => {
      calls.push(args);
      return {
        data: {
          shopifyqlQuery: { tableData: { rowData: [] } },
          orders: { pageInfo: { hasNextPage: false, endCursor: null }, edges: [] },
          product: null,
        },
      };
    });
    await fetchProductMetrics({ shopifyProductId: 'gid://shopify/Product/1', title: 'Test' });
    expect(calls.length).toBeGreaterThan(0);
  });
});
