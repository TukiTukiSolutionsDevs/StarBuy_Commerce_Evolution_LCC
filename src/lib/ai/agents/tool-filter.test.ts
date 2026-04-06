/**
 * Tool Filter Tests
 *
 * Verifies that each agent gets the correct tool subset and nothing more.
 *
 * NOTE: We mock @/lib/ai/tools because it imports the AI SDK which relies on
 * Web Streams APIs (TransformStream) not available in the jsdom test environment.
 * The mock factory is self-contained (no external variable references) because
 * vi.mock is hoisted to the top of the file by Vitest.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/ai/tools', () => {
  const toolNames = [
    'searchProducts',
    'getProduct',
    'createProduct',
    'updateProduct',
    'deleteProduct',
    'setProductPrice',
    'searchOrders',
    'getOrder',
    'cancelOrder',
    'createFulfillment',
    'refundOrder',
    'searchCustomers',
    'getCustomer',
    'createCustomer',
    'updateCustomer',
    'deleteCustomer',
    'getInventory',
    'setInventory',
    'listCollections',
    'addToCollection',
    'removeFromCollection',
    'createDiscount',
    'listDiscounts',
  ] as const;

  const adminToolsMap = Object.fromEntries(toolNames.map((name) => [name, { __toolName: name }]));

  return { adminToolsMap };
});

import { getAgentTools } from './tool-filter';

// ─── Catalog Agent ──────────────────────────────────────────────────────────────

describe('Agent Tool Filter — Catalog', () => {
  it('returns catalog-specific tools', () => {
    const tools = getAgentTools('catalog');
    const keys = Object.keys(tools);
    expect(keys).toContain('searchProducts');
    expect(keys).toContain('getProduct');
    expect(keys).toContain('createProduct');
    expect(keys).toContain('updateProduct');
    expect(keys).toContain('deleteProduct');
    expect(keys).toContain('listCollections');
    expect(keys).toContain('addToCollection');
    expect(keys).toContain('removeFromCollection');
  });

  it('does NOT include order tools in catalog', () => {
    const tools = getAgentTools('catalog');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('searchOrders');
    expect(keys).not.toContain('getOrder');
    expect(keys).not.toContain('cancelOrder');
    expect(keys).not.toContain('refundOrder');
  });

  it('does NOT include customer tools in catalog', () => {
    const tools = getAgentTools('catalog');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('searchCustomers');
    expect(keys).not.toContain('createCustomer');
  });

  it('does NOT include pricing-only tools in catalog', () => {
    const tools = getAgentTools('catalog');
    expect(Object.keys(tools)).not.toContain('createDiscount');
  });
});

// ─── Orders Agent ───────────────────────────────────────────────────────────────

describe('Agent Tool Filter — Orders', () => {
  it('returns orders-specific tools', () => {
    const tools = getAgentTools('orders');
    const keys = Object.keys(tools);
    expect(keys).toContain('searchOrders');
    expect(keys).toContain('getOrder');
    expect(keys).toContain('cancelOrder');
    expect(keys).toContain('createFulfillment');
    expect(keys).toContain('refundOrder');
  });

  it('does NOT include product mutation tools in orders', () => {
    const tools = getAgentTools('orders');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('createProduct');
    expect(keys).not.toContain('updateProduct');
    expect(keys).not.toContain('deleteProduct');
  });

  it('does NOT include inventory tools in orders', () => {
    const tools = getAgentTools('orders');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('setInventory');
    expect(keys).not.toContain('getInventory');
  });
});

// ─── Customers Agent ─────────────────────────────────────────────────────────────

describe('Agent Tool Filter — Customers', () => {
  it('returns customer-specific tools', () => {
    const tools = getAgentTools('customers');
    const keys = Object.keys(tools);
    expect(keys).toContain('searchCustomers');
    expect(keys).toContain('getCustomer');
    expect(keys).toContain('createCustomer');
    expect(keys).toContain('updateCustomer');
    expect(keys).toContain('deleteCustomer');
  });

  it('does NOT include order tools in customers', () => {
    const tools = getAgentTools('customers');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('cancelOrder');
    expect(keys).not.toContain('refundOrder');
    expect(keys).not.toContain('createFulfillment');
  });

  it('does NOT include product write tools in customers', () => {
    const tools = getAgentTools('customers');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('createProduct');
    expect(keys).not.toContain('deleteProduct');
  });
});

// ─── Pricing Agent ───────────────────────────────────────────────────────────────

describe('Agent Tool Filter — Pricing', () => {
  it('returns pricing-specific tools', () => {
    const tools = getAgentTools('pricing');
    const keys = Object.keys(tools);
    expect(keys).toContain('setProductPrice');
    expect(keys).toContain('createDiscount');
    expect(keys).toContain('listDiscounts');
  });

  it('does NOT include order mutation tools in pricing', () => {
    const tools = getAgentTools('pricing');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('cancelOrder');
    expect(keys).not.toContain('refundOrder');
  });

  it('does NOT include customer tools in pricing', () => {
    const tools = getAgentTools('pricing');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('createCustomer');
    expect(keys).not.toContain('deleteCustomer');
  });

  it('does NOT include inventory tools in pricing', () => {
    const tools = getAgentTools('pricing');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('setInventory');
    expect(keys).not.toContain('getInventory');
  });
});

// ─── Analytics Agent ─────────────────────────────────────────────────────────────

describe('Agent Tool Filter — Analytics', () => {
  it('returns read-only analytics tools (no mutations)', () => {
    const tools = getAgentTools('analytics');
    const keys = Object.keys(tools);
    // Read tools available
    expect(keys).toContain('searchProducts');
    expect(keys).toContain('searchOrders');
    expect(keys).toContain('searchCustomers');
    expect(keys).toContain('getInventory');
  });

  it('does NOT give analytics destructive product tools', () => {
    const tools = getAgentTools('analytics');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('createProduct');
    expect(keys).not.toContain('deleteProduct');
    expect(keys).not.toContain('updateProduct');
  });

  it('does NOT give analytics customer mutation tools', () => {
    const tools = getAgentTools('analytics');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('createCustomer');
    expect(keys).not.toContain('deleteCustomer');
    expect(keys).not.toContain('updateCustomer');
  });

  it('does NOT give analytics order mutation tools', () => {
    const tools = getAgentTools('analytics');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('cancelOrder');
    expect(keys).not.toContain('refundOrder');
    expect(keys).not.toContain('createFulfillment');
  });

  it('does NOT give analytics inventory write tools', () => {
    const tools = getAgentTools('analytics');
    expect(Object.keys(tools)).not.toContain('setInventory');
  });
});

// ─── Operations Agent ─────────────────────────────────────────────────────────────

describe('Agent Tool Filter — Operations', () => {
  it('returns operations-specific tools', () => {
    const tools = getAgentTools('operations');
    const keys = Object.keys(tools);
    expect(keys).toContain('getInventory');
    expect(keys).toContain('setInventory');
    expect(keys).toContain('searchProducts');
  });

  it('does NOT include order tools in operations', () => {
    const tools = getAgentTools('operations');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('cancelOrder');
    expect(keys).not.toContain('refundOrder');
    expect(keys).not.toContain('searchOrders');
  });

  it('does NOT include customer tools in operations', () => {
    const tools = getAgentTools('operations');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('createCustomer');
    expect(keys).not.toContain('deleteCustomer');
  });

  it('does NOT include pricing tools in operations', () => {
    const tools = getAgentTools('operations');
    const keys = Object.keys(tools);
    expect(keys).not.toContain('createDiscount');
    expect(keys).not.toContain('setProductPrice');
  });
});

// ─── Unknown / Fallback ───────────────────────────────────────────────────────────

describe('Agent Tool Filter — Fallback / Guard', () => {
  it('returns a non-empty tools object for every valid agent', () => {
    const agents = [
      'catalog',
      'orders',
      'customers',
      'pricing',
      'analytics',
      'operations',
    ] as const;
    for (const agentId of agents) {
      const tools = getAgentTools(agentId);
      expect(Object.keys(tools).length).toBeGreaterThan(0);
    }
  });
});
