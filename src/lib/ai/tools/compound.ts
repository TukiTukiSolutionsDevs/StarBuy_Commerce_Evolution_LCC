/**
 * Compound AI Tools
 *
 * Higher-level tools that combine multiple Shopify API calls into
 * single, semantically rich operations for the AI agents.
 *
 * These tools avoid back-and-forth API calls by pre-computing
 * aggregated data the agents need for analysis and reporting.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import * as products from '@/lib/shopify/admin/tools/products';
import * as orders from '@/lib/shopify/admin/tools/orders';
// inventory tools are used by individual agent actions, not compound tools
// import * as inventory from '@/lib/shopify/admin/tools/inventory';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RevenueAnalysis = {
  period: { start: string; end: string };
  totalRevenue: number;
  currency: string;
  orderCount: number;
  averageOrderValue: number;
  byDay: Array<{
    date: string;
    revenue: number;
    orderCount: number;
  }>;
  topOrderAmount: number;
  flaggedOrders: Array<{
    id: string;
    name: string;
    total: number;
    customer: string | null;
  }>;
};

export type ProductScore = {
  id: string;
  title: string;
  status: string;
  price: number;
  compareAtPrice: number | null;
  inventoryQuantity: number;
  hasImage: boolean;
  descriptionLength: number;
  score: number;
  scoreBreakdown: {
    inventory: number;
    hasImage: number;
    hasDescription: number;
    pricePositive: number;
    isActive: number;
  };
};

export type LowStockAlert = {
  productId: string;
  productTitle: string;
  productStatus: string;
  variantId: string;
  variantTitle: string;
  currentQuantity: number;
  severity: 'out_of_stock' | 'low_stock';
  emoji: '🔴' | '🟡';
};

export type BulkStatusResult = {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ productId: string; error: string }>;
};

// ─── analyzeRevenue ──────────────────────────────────────────────────────────

export const analyzeRevenueTool = tool({
  description:
    'Analyze store revenue for a date range. Returns total revenue, order count, AOV, daily breakdown, and flags high-value orders (>$500). Ideal for reports and trend analysis.',
  inputSchema: zodSchema(
    z.object({
      startDate: z
        .string()
        .describe(
          'Start date in ISO format (e.g. "2025-01-01"). Used to filter orders created after this date.',
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'End date in ISO format (defaults to today). Used to filter orders created before this date.',
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(250)
        .optional()
        .default(100)
        .describe('Max orders to analyze (default 100, max 250)'),
      flagThreshold: z
        .number()
        .optional()
        .default(500)
        .describe('Minimum order total to flag as high-value (default $500)'),
    }),
  ),
  execute: async ({
    startDate,
    endDate,
    limit = 100,
    flagThreshold = 500,
  }): Promise<RevenueAnalysis> => {
    const end = endDate ?? new Date().toISOString().split('T')[0];

    // Fetch orders in the date range using Shopify query syntax
    const query = `created_at:>=${startDate} created_at:<=${end}`;
    const orderList = await orders.searchOrders(query, limit, 'any');

    // Aggregate revenue
    let totalRevenue = 0;
    let currency = 'USD';
    const byDayMap = new Map<string, { revenue: number; orderCount: number }>();
    const flaggedOrders: RevenueAnalysis['flaggedOrders'] = [];

    for (const order of orderList) {
      const amount = parseFloat(order.currentTotalPriceSet.shopMoney.amount ?? '0');
      currency = order.currentTotalPriceSet.shopMoney.currencyCode;
      totalRevenue += amount;

      // Group by day
      const day = order.createdAt.split('T')[0];
      const existing = byDayMap.get(day) ?? { revenue: 0, orderCount: 0 };
      byDayMap.set(day, {
        revenue: existing.revenue + amount,
        orderCount: existing.orderCount + 1,
      });

      // Flag high-value orders
      if (amount >= flagThreshold) {
        flaggedOrders.push({
          id: order.id,
          name: order.name,
          total: amount,
          customer: order.customer
            ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() ||
              order.customer.email
            : null,
        });
      }
    }

    const orderCount = orderList.length;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
    const topOrderAmount =
      orderList.length > 0
        ? Math.max(
            ...orderList.map((o) => parseFloat(o.currentTotalPriceSet.shopMoney.amount ?? '0')),
          )
        : 0;

    // Sort daily data chronologically
    const byDay = Array.from(byDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    return {
      period: { start: startDate, end },
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      currency,
      orderCount,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      byDay,
      topOrderAmount: Math.round(topOrderAmount * 100) / 100,
      flaggedOrders,
    };
  },
});

// ─── getTopProducts ───────────────────────────────────────────────────────────

export const getTopProductsTool = tool({
  description:
    'Score and rank all products by a composite metric (inventory health + price + active status + image + description). Returns top N products sorted by score. Use for catalog analysis and identifying best performers.',
  inputSchema: zodSchema(
    z.object({
      topN: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe('Number of top products to return (default 10)'),
      statusFilter: z
        .enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'ALL'])
        .optional()
        .default('ALL')
        .describe('Filter by product status (default ALL)'),
    }),
  ),
  execute: async ({
    topN = 10,
    statusFilter = 'ALL',
  }): Promise<{ products: ProductScore[]; totalAnalyzed: number }> => {
    const query = statusFilter !== 'ALL' ? `status:${statusFilter.toLowerCase()}` : '';
    const productList = await products.searchProducts(query, 50);

    const scored: ProductScore[] = productList.map((p) => {
      const variants = p.variants.edges.map((e) => e.node);
      const totalInventory = variants.reduce((sum, v) => sum + (v.inventoryQuantity ?? 0), 0);
      const firstVariant = variants[0];
      const price = firstVariant ? parseFloat(firstVariant.price) : 0;
      const compareAtPrice = firstVariant?.compareAtPrice
        ? parseFloat(firstVariant.compareAtPrice)
        : null;
      const hasImage = p.featuredImage !== null;
      const descriptionLength = p.descriptionHtml
        ? p.descriptionHtml.replace(/<[^>]+>/g, '').trim().length
        : 0;

      // Scoring breakdown (0-100 scale)
      const scoreBreakdown = {
        // Inventory: 0-40 points (40 pts = 100+ units)
        inventory: Math.min(40, (totalInventory / 100) * 40),
        // Has image: 20 pts
        hasImage: hasImage ? 20 : 0,
        // Has description (>50 chars): 20 pts
        hasDescription: descriptionLength > 50 ? 20 : descriptionLength > 0 ? 10 : 0,
        // Price > 0: 10 pts
        pricePositive: price > 0 ? 10 : 0,
        // Active status: 10 pts
        isActive: p.status === 'ACTIVE' ? 10 : 0,
      };

      const score = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);

      return {
        id: p.id,
        title: p.title,
        status: p.status,
        price,
        compareAtPrice,
        inventoryQuantity: totalInventory,
        hasImage,
        descriptionLength,
        score: Math.round(score),
        scoreBreakdown: {
          inventory: Math.round(scoreBreakdown.inventory),
          hasImage: scoreBreakdown.hasImage,
          hasDescription: scoreBreakdown.hasDescription,
          pricePositive: scoreBreakdown.pricePositive,
          isActive: scoreBreakdown.isActive,
        },
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return {
      products: scored.slice(0, topN),
      totalAnalyzed: scored.length,
    };
  },
});

// ─── getLowStockAlerts ────────────────────────────────────────────────────────

export const getLowStockAlertsTool = tool({
  description:
    'Scan the entire product catalog for low or zero stock variants. Returns structured alerts with severity (🔴 out of stock, 🟡 low stock). Use for proactive inventory monitoring.',
  inputSchema: zodSchema(
    z.object({
      threshold: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(10)
        .describe(
          'Quantity threshold for low stock alert (default 10). Variants at 0 are always flagged as out-of-stock.',
        ),
      activeOnly: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'Only check ACTIVE products (default true). Set false to include draft/archived.',
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(250)
        .optional()
        .default(50)
        .describe('Max products to scan (default 50)'),
    }),
  ),
  execute: async ({
    threshold = 10,
    activeOnly = true,
    limit = 50,
  }): Promise<{
    alerts: LowStockAlert[];
    outOfStockCount: number;
    lowStockCount: number;
    summary: string;
  }> => {
    const query = activeOnly ? 'status:active' : '';
    const productList = await products.searchProducts(query, limit);

    const alerts: LowStockAlert[] = [];

    for (const product of productList) {
      for (const { node: variant } of product.variants.edges) {
        const qty = variant.inventoryQuantity ?? 0;

        if (qty <= threshold) {
          const isOutOfStock = qty <= 0;
          alerts.push({
            productId: product.id,
            productTitle: product.title,
            productStatus: product.status,
            variantId: variant.id,
            variantTitle: variant.title,
            currentQuantity: qty,
            severity: isOutOfStock ? 'out_of_stock' : 'low_stock',
            emoji: isOutOfStock ? '🔴' : '🟡',
          });
        }
      }
    }

    // Sort: out of stock first, then by quantity ascending
    alerts.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'out_of_stock' ? -1 : 1;
      }
      return a.currentQuantity - b.currentQuantity;
    });

    const outOfStockCount = alerts.filter((a) => a.severity === 'out_of_stock').length;
    const lowStockCount = alerts.filter((a) => a.severity === 'low_stock').length;

    const summary =
      alerts.length === 0
        ? `✅ All ${productList.length} products scanned — no stock issues found.`
        : `Found ${outOfStockCount} out-of-stock and ${lowStockCount} low-stock variants across ${productList.length} products scanned.`;

    return { alerts, outOfStockCount, lowStockCount, summary };
  },
});

// ─── bulkUpdateProductStatus ──────────────────────────────────────────────────

export const bulkUpdateProductStatusTool = tool({
  description:
    '[DESTRUCTIVE] Update the status (ACTIVE/DRAFT/ARCHIVED) of multiple products at once. Processes each product in sequence and returns a success/failure report. Always confirm with the user before executing.',
  inputSchema: zodSchema(
    z.object({
      updates: z
        .array(
          z.object({
            productId: z.string().describe('Product ID or GID'),
            status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).describe('New status to apply'),
          }),
        )
        .min(1)
        .max(50)
        .describe('Array of product ID + new status pairs (max 50 at once)'),
    }),
  ),
  execute: async ({ updates }): Promise<BulkStatusResult> => {
    let succeeded = 0;
    const errors: BulkStatusResult['errors'] = [];

    for (const { productId, status } of updates) {
      try {
        const result = await products.updateProduct(productId, { status });
        if (result.userErrors.length > 0) {
          errors.push({
            productId,
            error: result.userErrors.map((e) => e.message).join(', '),
          });
        } else {
          succeeded++;
        }
      } catch (err) {
        errors.push({
          productId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return {
      total: updates.length,
      succeeded,
      failed: errors.length,
      errors,
    };
  },
});

// ─── Compound Tools Export ────────────────────────────────────────────────────

export const compoundTools = {
  analyzeRevenue: analyzeRevenueTool,
  getTopProducts: getTopProductsTool,
  getLowStockAlerts: getLowStockAlertsTool,
  bulkUpdateProductStatus: bulkUpdateProductStatusTool,
};
