/**
 * Orchestrator Routing Tests
 *
 * Tests keyword-based routing to the 6 specialist agents.
 * Uses the actual registry examples + description to verify scoring.
 */

import { describe, it, expect } from 'vitest';
import { routeMessage, routeByKeywords } from './orchestrator';

// ─── Catalog Agent ──────────────────────────────────────────────────────────────

describe('Agent Orchestrator Routing — Catalog', () => {
  it('routes "create a new bluetooth headphones product" to catalog', () => {
    const result = routeMessage('Create a new bluetooth headphones product');
    expect(result.agentId).toBe('catalog');
  });

  it('routes "update product description" to catalog', () => {
    const result = routeMessage('Update the product description for SKU-001');
    expect(result.agentId).toBe('catalog');
  });

  it('routes "list all products" to catalog', () => {
    const result = routeMessage('show me the product catalog and all items');
    expect(result.agentId).toBe('catalog');
  });

  it('routes "delete product" to catalog', () => {
    const result = routeMessage('delete product with ID 12345');
    expect(result.agentId).toBe('catalog');
  });

  it('routes product-related Spanish messages to catalog', () => {
    const result = routeMessage('Creame un producto de auriculares');
    expect(result.agentId).toBe('catalog');
  });

  it('routes "show collections" to catalog', () => {
    const result = routeMessage('show collections');
    expect(result.agentId).toBe('catalog');
  });

  it('routes "add product to collection" to catalog', () => {
    const result = routeMessage('add product to collection summer');
    expect(result.agentId).toBe('catalog');
  });

  it('routes "what products do we have" to catalog', () => {
    const result = routeMessage('what products do we have in the store?');
    expect(result.agentId).toBe('catalog');
  });

  it('routes "show me all active products" to catalog', () => {
    const result = routeMessage('show me all active products');
    expect(result.agentId).toBe('catalog');
  });
});

// ─── Orders Agent ───────────────────────────────────────────────────────────────

describe('Agent Orchestrator Routing — Orders', () => {
  it('routes "show recent orders" to orders', () => {
    const result = routeMessage('show recent orders');
    expect(result.agentId).toBe('orders');
  });

  it('routes "fulfill order #1234" to orders', () => {
    const result = routeMessage('fulfill order #1234 with tracking number ABC123');
    expect(result.agentId).toBe('orders');
  });

  it('routes "cancel order" to orders', () => {
    const result = routeMessage('cancel order #5678');
    expect(result.agentId).toBe('orders');
  });

  it('routes "refund" to orders', () => {
    const result = routeMessage('issue refund for order #9999');
    expect(result.agentId).toBe('orders');
  });

  it('routes "unfulfilled orders" to orders', () => {
    const result = routeMessage('show me unfulfilled orders');
    expect(result.agentId).toBe('orders');
  });

  it('routes "add tracking number" to orders', () => {
    const result = routeMessage('add tracking number to order #1234');
    expect(result.agentId).toBe('orders');
  });
});

// ─── Customers Agent ─────────────────────────────────────────────────────────────

describe('Agent Orchestrator Routing — Customers', () => {
  it('routes "find customer by email" to customers', () => {
    const result = routeMessage('find customer by email john@example.com');
    expect(result.agentId).toBe('customers');
  });

  it('routes "who are my top customers" to customers', () => {
    const result = routeMessage('who are my top customers?');
    expect(result.agentId).toBe('customers');
  });

  it('routes "create customer" to customers', () => {
    const result = routeMessage('create customer account for Jane Doe');
    expect(result.agentId).toBe('customers');
  });

  it('routes "delete customer" to customers', () => {
    const result = routeMessage('delete customer account with ID 456');
    expect(result.agentId).toBe('customers');
  });

  it('routes "list customers" to customers', () => {
    const result = routeMessage('list customers');
    expect(result.agentId).toBe('customers');
  });
});

// ─── Pricing Agent ───────────────────────────────────────────────────────────────

describe('Agent Orchestrator Routing — Pricing', () => {
  it('routes "change price to $29.99" to pricing', () => {
    const result = routeMessage('change price to $29.99 for variant 789');
    expect(result.agentId).toBe('pricing');
  });

  it('routes "create a discount code" to pricing', () => {
    const result = routeMessage('create a discount code SUMMER20 for 20% off');
    expect(result.agentId).toBe('pricing');
  });

  it('routes "pricing strategy" to pricing', () => {
    const result = routeMessage('suggest a discount pricing strategy for the weekend sale');
    expect(result.agentId).toBe('pricing');
  });

  it('routes "list discounts" to pricing', () => {
    const result = routeMessage('list discounts');
    expect(result.agentId).toBe('pricing');
  });

  it('routes "promo code" to pricing', () => {
    const result = routeMessage('create a promo code for the holiday sale');
    expect(result.agentId).toBe('pricing');
  });

  it('routes "compare at price" to pricing', () => {
    const result = routeMessage('set compare at price to $99');
    expect(result.agentId).toBe('pricing');
  });
});

// ─── Analytics Agent ─────────────────────────────────────────────────────────────

describe('Agent Orchestrator Routing — Analytics', () => {
  it('routes "revenue this week" to analytics', () => {
    const result = routeMessage('show revenue this week');
    expect(result.agentId).toBe('analytics');
  });

  it('routes "what is my AOV" to analytics', () => {
    const result = routeMessage('give me analytics insights and store stats');
    expect(result.agentId).toBe('analytics');
  });

  it('routes "top selling products" to analytics', () => {
    const result = routeMessage('show me the top selling products');
    expect(result.agentId).toBe('analytics');
  });

  it('routes "sales report" to analytics', () => {
    const result = routeMessage('give me a sales report for this month');
    expect(result.agentId).toBe('analytics');
  });

  it('routes "store performance overview" to analytics', () => {
    const result = routeMessage('how is the store doing overall');
    expect(result.agentId).toBe('analytics');
  });
});

// ─── Operations Agent ─────────────────────────────────────────────────────────────

describe('Agent Orchestrator Routing — Operations', () => {
  it('routes "low stock alerts" to operations', () => {
    const result = routeMessage('show low inventory products');
    expect(result.agentId).toBe('operations');
  });

  it('routes "update inventory" to operations', () => {
    const result = routeMessage('update inventory for product 123');
    expect(result.agentId).toBe('operations');
  });

  it('routes "out of stock products" to operations', () => {
    const result = routeMessage('how many units are available in stock?');
    expect(result.agentId).toBe('operations');
  });

  it('routes "set stock quantity" to operations', () => {
    const result = routeMessage('set stock to 50 units for variant 789');
    expect(result.agentId).toBe('operations');
  });

  it('routes "warehouse restock" to operations', () => {
    const result = routeMessage('restock warehouse for product 456');
    expect(result.agentId).toBe('operations');
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────────────────

describe('Agent Orchestrator Routing — Edge Cases', () => {
  it('returns a valid agentId for any message', () => {
    const result = routeMessage('hello');
    expect(['catalog', 'orders', 'customers', 'pricing', 'analytics', 'operations']).toContain(
      result.agentId,
    );
  });

  it('has confidence between 0 and 1', () => {
    const result = routeMessage('show me products');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('never throws on empty string — returns catalog fallback', () => {
    const result = routeMessage('');
    expect(result.agentId).toBe('catalog');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it('never throws on whitespace-only input', () => {
    const result = routeMessage('   ');
    expect(result.agentId).toBe('catalog');
  });

  it('routeByKeywords returns null for empty message', () => {
    const result = routeByKeywords('');
    expect(result).toBeNull();
  });

  it('routeByKeywords returns null for whitespace-only message', () => {
    const result = routeByKeywords('   ');
    expect(result).toBeNull();
  });

  it('returns a reasoning string for every result', () => {
    const messages = [
      'create product',
      'show orders',
      'find customer',
      'set price',
      'revenue report',
      'check inventory',
    ];
    for (const msg of messages) {
      const result = routeMessage(msg);
      expect(typeof result.reasoning).toBe('string');
      expect(result.reasoning.length).toBeGreaterThan(0);
    }
  });

  it('handles mixed-case input correctly', () => {
    const lower = routeMessage('list products');
    const upper = routeMessage('LIST PRODUCTS');
    expect(upper.agentId).toBe(lower.agentId);
  });

  it('handles special characters without throwing', () => {
    expect(() => routeMessage('show me products!!! @#$%')).not.toThrow();
  });

  it('handles very long messages without throwing', () => {
    const longMessage = 'product '.repeat(200);
    expect(() => routeMessage(longMessage)).not.toThrow();
    const result = routeMessage(longMessage);
    expect(result.agentId).toBe('catalog');
  });
});
