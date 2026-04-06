/**
 * Vercel AI SDK — Tool Definitions
 *
 * All Shopify Admin tools exposed to the AI assistant.
 * Destructive tools are marked with [DESTRUCTIVE] in their descriptions.
 *
 * Compound tools (analyzeRevenue, getTopProducts, getLowStockAlerts,
 * bulkUpdateProductStatus) are defined in ./tools/compound.ts and
 * re-exported here for unified access by the multi-agent system.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import * as products from '@/lib/shopify/admin/tools/products';
import * as orders from '@/lib/shopify/admin/tools/orders';
import * as customers from '@/lib/shopify/admin/tools/customers';
import * as inventory from '@/lib/shopify/admin/tools/inventory';
import * as collections from '@/lib/shopify/admin/tools/collections';
import * as discounts from '@/lib/shopify/admin/tools/discounts';
import {
  analyzeRevenueTool,
  getTopProductsTool,
  getLowStockAlertsTool,
  bulkUpdateProductStatusTool,
} from './tools/compound';

// Re-export compound tools for direct access if needed
export {
  analyzeRevenueTool,
  getTopProductsTool,
  getLowStockAlertsTool,
  bulkUpdateProductStatusTool,
} from './tools/compound';

// ─── Product Tools ──────────────────────────────────────────────────────────────

export const searchProductsTool = tool({
  description:
    'Search or list products in the Shopify store. Returns product details including title, price, status, and inventory.',
  inputSchema: zodSchema(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Search query (e.g. "t-shirt", "status:active"). Leave empty to list all products.',
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe('Number of products to return (max 50)'),
    }),
  ),
  execute: async ({ query = '', limit = 10 }) => {
    return await products.searchProducts(query, limit);
  },
});

export const getProductTool = tool({
  description: 'Get full details of a specific product by its ID or GID.',
  inputSchema: zodSchema(
    z.object({
      id: z
        .string()
        .describe(
          'Product ID (numeric like "123456789" or GID like "gid://shopify/Product/123456789")',
        ),
    }),
  ),
  execute: async ({ id }) => {
    return await products.getProductById(id);
  },
});

export const createProductTool = tool({
  description:
    'Create a new product in the Shopify store. Automatically publishes to the Headless channel and sets 100 units of inventory.',
  inputSchema: zodSchema(
    z.object({
      title: z.string().describe('Product title'),
      descriptionHtml: z.string().optional().describe('Product description (HTML allowed)'),
      vendor: z.string().optional().describe('Product vendor/brand name'),
      productType: z.string().optional().describe('Product type/category'),
      tags: z.array(z.string()).optional().describe('Array of tags for the product'),
      status: z
        .enum(['ACTIVE', 'DRAFT', 'ARCHIVED'])
        .optional()
        .default('ACTIVE')
        .describe('Product status'),
      price: z.string().optional().describe('Price in store currency (e.g. "29.99")'),
    }),
  ),
  execute: async (input) => {
    return await products.createProduct(input);
  },
});

export const updateProductTool = tool({
  description: "Update an existing product's fields.",
  inputSchema: zodSchema(
    z.object({
      id: z.string().describe('Product ID or GID'),
      title: z.string().optional().describe('New product title'),
      descriptionHtml: z.string().optional().describe('New description (HTML)'),
      vendor: z.string().optional().describe('New vendor name'),
      productType: z.string().optional().describe('New product type'),
      tags: z.array(z.string()).optional().describe('New tags array'),
      status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional().describe('New status'),
    }),
  ),
  execute: async ({ id, ...fields }) => {
    return await products.updateProduct(id, fields);
  },
});

export const deleteProductTool = tool({
  description:
    '[DESTRUCTIVE] Permanently delete a product from the store. This action cannot be undone.',
  inputSchema: zodSchema(
    z.object({
      id: z.string().describe('Product ID or GID to delete'),
    }),
  ),
  execute: async ({ id }) => {
    return await products.deleteProduct(id);
  },
});

export const setProductPriceTool = tool({
  description: 'Update the price (and optionally compare-at price) of a product variant.',
  inputSchema: zodSchema(
    z.object({
      variantId: z.string().describe('Variant ID or GID'),
      price: z.string().describe('New price (e.g. "49.99")'),
      compareAtPrice: z
        .string()
        .optional()
        .describe('Compare-at price for showing a "sale" (e.g. "79.99")'),
    }),
  ),
  execute: async ({ variantId, price, compareAtPrice }) => {
    return await products.setProductPrice(variantId, price, compareAtPrice);
  },
});

// ─── Order Tools ────────────────────────────────────────────────────────────────

export const searchOrdersTool = tool({
  description: 'Search or list orders. Can filter by status, customer email, or order name.',
  inputSchema: zodSchema(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Search query (e.g. customer email, order name "#1234"). Leave empty for recent orders.',
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe('Number of orders to return'),
      status: z.string().optional().describe('Filter by status: open, closed, cancelled, any'),
    }),
  ),
  execute: async ({ query = '', limit = 10, status }) => {
    return await orders.searchOrders(query, limit, status);
  },
});

export const getOrderTool = tool({
  description:
    'Get full details of a specific order. Accepts order name (#1234), numeric ID, or GID.',
  inputSchema: zodSchema(
    z.object({
      orderId: z.string().describe('Order identifier: "#1234", numeric ID, or full GID'),
    }),
  ),
  execute: async ({ orderId }) => {
    return await orders.getOrderById(orderId);
  },
});

export const cancelOrderTool = tool({
  description: '[DESTRUCTIVE] Cancel an order. Optionally restock items and process a refund.',
  inputSchema: zodSchema(
    z.object({
      orderId: z.string().describe('Order ID, name, or GID'),
      reason: z
        .enum(['CUSTOMER', 'DECLINED', 'FRAUD', 'INVENTORY', 'OTHER', 'STAFF'])
        .optional()
        .default('OTHER')
        .describe('Cancellation reason'),
      restock: z.boolean().optional().default(true).describe('Whether to restock the items'),
      refund: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to automatically issue a refund'),
    }),
  ),
  execute: async ({ orderId, reason = 'OTHER', restock = true, refund = false }) => {
    return await orders.cancelOrder(orderId, reason, restock, refund);
  },
});

export const createFulfillmentTool = tool({
  description: 'Mark an order as shipped by creating a fulfillment with optional tracking info.',
  inputSchema: zodSchema(
    z.object({
      orderId: z.string().describe('Order ID, name, or GID'),
      trackingNumber: z.string().optional().describe('Carrier tracking number'),
      trackingUrl: z.string().optional().describe('Tracking URL for the shipment'),
      company: z.string().optional().describe('Shipping carrier name (e.g. "UPS", "FedEx", "DHL")'),
    }),
  ),
  execute: async ({ orderId, trackingNumber, trackingUrl, company }) => {
    return await orders.createFulfillment(orderId, trackingNumber, trackingUrl, company);
  },
});

export const refundOrderTool = tool({
  description: '[DESTRUCTIVE] Create a refund for an order. Can refund specific line items.',
  inputSchema: zodSchema(
    z.object({
      orderId: z.string().describe('Order ID, name, or GID'),
      lineItems: z
        .array(
          z.object({
            lineItemId: z.string().describe('Line item ID or GID'),
            quantity: z.number().int().min(1).describe('Quantity to refund'),
            restockType: z
              .enum(['RETURN', 'CANCEL', 'NO_RESTOCK'])
              .optional()
              .default('NO_RESTOCK'),
          }),
        )
        .optional()
        .describe('Specific line items to refund. Leave empty to refund the full order.'),
      note: z.string().optional().describe('Internal note for the refund'),
    }),
  ),
  execute: async ({ orderId, lineItems, note }) => {
    return await orders.refundOrder(orderId, lineItems, note);
  },
});

// ─── Customer Tools ──────────────────────────────────────────────────────────────

export const searchCustomersTool = tool({
  description: 'Search or list customers by name, email, or other criteria.',
  inputSchema: zodSchema(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Search query (e.g. customer name, email). Leave empty to list recent customers.',
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe('Number of customers to return'),
    }),
  ),
  execute: async ({ query = '', limit = 10 }) => {
    return await customers.searchCustomers(query, limit);
  },
});

export const getCustomerTool = tool({
  description: 'Get detailed information about a specific customer.',
  inputSchema: zodSchema(
    z.object({
      id: z.string().describe('Customer ID (numeric or GID)'),
    }),
  ),
  execute: async ({ id }) => {
    return await customers.getCustomerById(id);
  },
});

export const createCustomerTool = tool({
  description: 'Create a new customer account in the store.',
  inputSchema: zodSchema(
    z.object({
      firstName: z.string().describe('Customer first name'),
      lastName: z.string().describe('Customer last name'),
      email: z.string().email().describe('Customer email address'),
      phone: z.string().optional().describe('Phone number (E.164 format)'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the customer'),
    }),
  ),
  execute: async (input) => {
    return await customers.createCustomer(input);
  },
});

export const updateCustomerTool = tool({
  description: "Update an existing customer's information.",
  inputSchema: zodSchema(
    z.object({
      id: z.string().describe('Customer ID or GID'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
  ),
  execute: async ({ id, ...fields }) => {
    return await customers.updateCustomer(id, fields);
  },
});

export const deleteCustomerTool = tool({
  description: '[DESTRUCTIVE] Permanently delete a customer account. This cannot be undone.',
  inputSchema: zodSchema(
    z.object({
      id: z.string().describe('Customer ID or GID to delete'),
    }),
  ),
  execute: async ({ id }) => {
    return await customers.deleteCustomer(id);
  },
});

// ─── Inventory Tools ─────────────────────────────────────────────────────────────

export const getInventoryTool = tool({
  description: 'Check inventory levels for a product across all locations.',
  inputSchema: zodSchema(
    z.object({
      productId: z.string().describe('Product ID or GID'),
    }),
  ),
  execute: async ({ productId }) => {
    return await inventory.getInventoryLevels(productId);
  },
});

export const setInventoryTool = tool({
  description: 'Set the available stock quantity for all variants of a product.',
  inputSchema: zodSchema(
    z.object({
      productId: z.string().describe('Product ID or GID'),
      quantity: z.number().int().min(0).describe('New inventory quantity (0 or more)'),
      locationId: z.string().optional().describe('Location GID. Defaults to the main warehouse.'),
    }),
  ),
  execute: async ({ productId, quantity, locationId }) => {
    return await inventory.setInventoryQuantity(productId, quantity, locationId);
  },
});

// ─── Collection Tools ────────────────────────────────────────────────────────────

export const listCollectionsTool = tool({
  description: 'List all collections in the store.',
  inputSchema: zodSchema(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe('Number of collections to return'),
    }),
  ),
  execute: async ({ limit = 20 }) => {
    return await collections.listCollections(limit);
  },
});

export const addToCollectionTool = tool({
  description: 'Add a product to a collection.',
  inputSchema: zodSchema(
    z.object({
      productId: z.string().describe('Product ID or GID'),
      collectionId: z.string().describe('Collection ID or GID'),
    }),
  ),
  execute: async ({ productId, collectionId }) => {
    return await collections.addProductToCollection(productId, collectionId);
  },
});

export const removeFromCollectionTool = tool({
  description: '[DESTRUCTIVE] Remove a product from a collection.',
  inputSchema: zodSchema(
    z.object({
      productId: z.string().describe('Product ID or GID'),
      collectionId: z.string().describe('Collection ID or GID'),
    }),
  ),
  execute: async ({ productId, collectionId }) => {
    return await collections.removeProductFromCollection(productId, collectionId);
  },
});

// ─── Discount Tools ──────────────────────────────────────────────────────────────

export const createDiscountTool = tool({
  description: 'Create a percentage-based discount code.',
  inputSchema: zodSchema(
    z.object({
      title: z.string().describe('Internal title for the discount (e.g. "Summer Sale 20%")'),
      code: z.string().describe('Discount code customers will enter (e.g. "SUMMER20")'),
      percentage: z.number().min(1).max(100).describe('Discount percentage (1-100)'),
      startsAt: z.string().optional().describe('Start date ISO string (defaults to now)'),
      endsAt: z.string().optional().describe('Expiry date ISO string (optional)'),
      usageLimit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of times the discount can be used'),
    }),
  ),
  execute: async (input) => {
    return await discounts.createDiscountCode(input);
  },
});

export const listDiscountsTool = tool({
  description: 'List active discount codes in the store.',
  inputSchema: zodSchema(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe('Number of discounts to return'),
    }),
  ),
  execute: async ({ limit = 20 }) => {
    return await discounts.listDiscounts(limit);
  },
});

// ─── All Tools Export ────────────────────────────────────────────────────────────

export const adminTools = {
  // ── Core product tools
  searchProducts: searchProductsTool,
  getProduct: getProductTool,
  createProduct: createProductTool,
  updateProduct: updateProductTool,
  deleteProduct: deleteProductTool,
  setProductPrice: setProductPriceTool,
  // ── Order tools
  searchOrders: searchOrdersTool,
  getOrder: getOrderTool,
  cancelOrder: cancelOrderTool,
  createFulfillment: createFulfillmentTool,
  refundOrder: refundOrderTool,
  // ── Customer tools
  searchCustomers: searchCustomersTool,
  getCustomer: getCustomerTool,
  createCustomer: createCustomerTool,
  updateCustomer: updateCustomerTool,
  deleteCustomer: deleteCustomerTool,
  // ── Inventory tools
  getInventory: getInventoryTool,
  setInventory: setInventoryTool,
  // ── Collection tools
  listCollections: listCollectionsTool,
  addToCollection: addToCollectionTool,
  removeFromCollection: removeFromCollectionTool,
  // ── Discount tools
  createDiscount: createDiscountTool,
  listDiscounts: listDiscountsTool,
  // ── Compound tools (multi-step aggregations)
  analyzeRevenue: analyzeRevenueTool,
  getTopProducts: getTopProductsTool,
  getLowStockAlerts: getLowStockAlertsTool,
  bulkUpdateProductStatus: bulkUpdateProductStatusTool,
};

// ─── Named Tool Map (for agent tool filtering) ───────────────────────────────────

/**
 * Same tools as adminTools but exported as a named map.
 * Used by the multi-agent tool-filter to build per-agent tool subsets.
 */
export const adminToolsMap: Record<string, (typeof adminTools)[keyof typeof adminTools]> = {
  // ── Core product tools
  searchProducts: searchProductsTool,
  getProduct: getProductTool,
  createProduct: createProductTool,
  updateProduct: updateProductTool,
  deleteProduct: deleteProductTool,
  setProductPrice: setProductPriceTool,
  // ── Order tools
  searchOrders: searchOrdersTool,
  getOrder: getOrderTool,
  cancelOrder: cancelOrderTool,
  createFulfillment: createFulfillmentTool,
  refundOrder: refundOrderTool,
  // ── Customer tools
  searchCustomers: searchCustomersTool,
  getCustomer: getCustomerTool,
  createCustomer: createCustomerTool,
  updateCustomer: updateCustomerTool,
  deleteCustomer: deleteCustomerTool,
  // ── Inventory tools
  getInventory: getInventoryTool,
  setInventory: setInventoryTool,
  // ── Collection tools
  listCollections: listCollectionsTool,
  addToCollection: addToCollectionTool,
  removeFromCollection: removeFromCollectionTool,
  // ── Discount tools
  createDiscount: createDiscountTool,
  listDiscounts: listDiscountsTool,
  // ── Compound tools (multi-step aggregations)
  analyzeRevenue: analyzeRevenueTool,
  getTopProducts: getTopProductsTool,
  getLowStockAlerts: getLowStockAlertsTool,
  bulkUpdateProductStatus: bulkUpdateProductStatusTool,
};
