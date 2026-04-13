/**
 * Monitor Module — Metrics Fetcher
 *
 * Fetches views (ShopifyQL), orders (slim query), and inventory
 * from the Shopify Admin API and assembles ProductMetrics.
 */

import { adminFetch } from '@/lib/shopify/admin/client';
import { SHOPIFYQL_VIEWS_QUERY, SLIM_ORDERS_QUERY, INVENTORY_LEVELS_QUERY } from './queries';
import type { FetchMetricsInput, ProductMetrics } from './types';

// ─── fetchProductViews ────────────────────────────────────────────────────────

export async function fetchProductViews(id: string, from: Date, to: Date): Promise<number> {
  try {
    const numericId = id.split('/').pop() ?? id;
    const shopifyqlStr = `FROM sessions SINCE '${from.toISOString()}' UNTIL '${to.toISOString()}' WHERE product_id = '${numericId}' SHOW sessions AS views`;

    const res = await adminFetch<{
      data?: { shopifyqlQuery: { tableData: { rowData: string[][] } } | null };
    }>({ query: SHOPIFYQL_VIEWS_QUERY, variables: { query: shopifyqlStr } });

    const rowData = res.data?.shopifyqlQuery?.tableData?.rowData ?? [];
    if (!rowData.length || !rowData[0].length) return 0;
    return parseInt(rowData[0][0], 10) || 0;
  } catch {
    return 0;
  }
}

// ─── fetchProductOrders ───────────────────────────────────────────────────────

type OrderEdge = {
  node: {
    id: string;
    lineItems: {
      edges: Array<{
        node: {
          product: { id: string } | null;
          quantity: number;
          originalTotalSet: { shopMoney: { amount: string } };
        };
      }>;
    };
  };
};

export async function fetchProductOrders(
  id: string,
  from: Date,
  to: Date,
): Promise<{ orders: number; revenue: number }> {
  try {
    const numericId = id.split('/').pop() ?? id;
    const query = `product_id:${numericId} created_at:>=${from.toISOString()} created_at:<=${to.toISOString()}`;

    const res = await adminFetch<{
      data?: {
        orders: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          edges: OrderEdge[];
        };
      };
    }>({ query: SLIM_ORDERS_QUERY, variables: { query } });

    const edges = res.data?.orders?.edges ?? [];
    let orders = 0;
    let revenue = 0;

    for (const { node: order } of edges) {
      for (const { node: item } of order.lineItems.edges) {
        if (item.product?.id === id) {
          orders += item.quantity;
          revenue += parseFloat(item.originalTotalSet.shopMoney.amount);
        }
      }
    }

    return { orders, revenue };
  } catch {
    return { orders: 0, revenue: 0 };
  }
}

// ─── fetchProductInventory ────────────────────────────────────────────────────

type InventoryResponse = {
  data?: {
    product: {
      variants: {
        edges: Array<{
          node: {
            inventoryItem: {
              inventoryLevels: {
                edges: Array<{ node: { available: number } }>;
              };
            };
          };
        }>;
      };
    } | null;
  };
};

export async function fetchProductInventory(id: string): Promise<number> {
  try {
    const res = await adminFetch<InventoryResponse>({
      query: INVENTORY_LEVELS_QUERY,
      variables: { productId: id },
    });

    const variants = res.data?.product?.variants?.edges ?? [];
    let total = 0;
    for (const { node: variant } of variants) {
      for (const { node: level } of variant.inventoryItem.inventoryLevels.edges) {
        total += level.available;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

// ─── fetchProductMetrics ──────────────────────────────────────────────────────

export async function fetchProductMetrics(
  input: FetchMetricsInput,
): Promise<Omit<ProductMetrics, 'health' | 'healthReasons'>> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [views, { orders, revenue }, inventory] = await Promise.all([
    fetchProductViews(input.shopifyProductId, weekAgo, now),
    fetchProductOrders(input.shopifyProductId, weekAgo, now),
    fetchProductInventory(input.shopifyProductId),
  ]);

  return {
    shopifyProductId: input.shopifyProductId,
    title: input.title,
    fetchedAt: now.toISOString(),
    views,
    orders,
    revenue,
    conversionRate: views > 0 ? orders / views : 0,
    inventory,
  };
}
