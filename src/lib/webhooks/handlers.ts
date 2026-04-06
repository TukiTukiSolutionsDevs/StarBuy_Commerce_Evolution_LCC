/**
 * Shopify Webhook Handlers
 *
 * Per-topic business logic. Each handler receives the parsed payload,
 * executes domain logic, and delegates logging to activity-log.
 *
 * All handlers are fire-and-forget (called without await from the receiver).
 */

import { saveActivity } from './activity-log';

// ─── Payload types (minimal — we only read what we need) ───────────────────────

interface ShopifyOrderPayload {
  id?: number;
  order_number?: number;
  name?: string; // e.g. "#1001"
  email?: string;
  total_price?: string;
  currency?: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

interface ShopifyProductPayload {
  id?: number;
  title?: string;
}

interface ShopifyInventoryPayload {
  inventory_item_id?: number;
  location_id?: number;
  available?: number;
}

interface ShopifyCustomerPayload {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
}

// ─── Handler type ─────────────────────────────────────────────────────────────

type WebhookHandler = (payload: unknown) => Promise<void>;

// ─── Low-stock threshold ──────────────────────────────────────────────────────

const LOW_STOCK_THRESHOLD = 5;

// ─── Handlers ─────────────────────────────────────────────────────────────────

const handlers: Record<string, WebhookHandler> = {
  'orders/create': async (payload) => {
    const p = payload as ShopifyOrderPayload;
    const orderRef = p.name ?? (p.order_number ? `#${p.order_number}` : `#${p.id ?? '?'}`);
    const customerName = p.customer
      ? `${p.customer.first_name ?? ''} ${p.customer.last_name ?? ''}`.trim() || p.customer.email
      : (p.email ?? 'Guest');
    const amount = p.total_price ? `${p.currency ?? ''} ${p.total_price}`.trim() : 'unknown amount';

    saveActivity({
      type: 'webhook',
      topic: 'orders/create',
      summary: `New order ${orderRef} from ${customerName} — ${amount}`,
      details: payload,
      severity: 'success',
    });
  },

  'orders/fulfilled': async (payload) => {
    const p = payload as ShopifyOrderPayload;
    const orderRef = p.name ?? `#${p.order_number ?? p.id ?? '?'}`;

    saveActivity({
      type: 'webhook',
      topic: 'orders/fulfilled',
      summary: `Order ${orderRef} fulfilled`,
      details: payload,
      severity: 'success',
    });
  },

  'orders/cancelled': async (payload) => {
    const p = payload as ShopifyOrderPayload;
    const orderRef = p.name ?? `#${p.order_number ?? p.id ?? '?'}`;

    saveActivity({
      type: 'webhook',
      topic: 'orders/cancelled',
      summary: `Order ${orderRef} cancelled`,
      details: payload,
      severity: 'warning',
    });
  },

  'orders/updated': async (payload) => {
    const p = payload as ShopifyOrderPayload;
    const orderRef = p.name ?? `#${p.order_number ?? p.id ?? '?'}`;

    saveActivity({
      type: 'webhook',
      topic: 'orders/updated',
      summary: `Order ${orderRef} updated`,
      details: payload,
      severity: 'info',
    });
  },

  'products/create': async (payload) => {
    const p = payload as ShopifyProductPayload;

    saveActivity({
      type: 'webhook',
      topic: 'products/create',
      summary: `New product created: ${p.title ?? `ID ${p.id ?? '?'}`}`,
      details: payload,
      severity: 'info',
    });
  },

  'products/update': async (payload) => {
    const p = payload as ShopifyProductPayload;

    saveActivity({
      type: 'webhook',
      topic: 'products/update',
      summary: `Product updated: ${p.title ?? `ID ${p.id ?? '?'}`}`,
      details: payload,
      severity: 'info',
    });
  },

  'products/delete': async (payload) => {
    const p = payload as ShopifyProductPayload;

    saveActivity({
      type: 'webhook',
      topic: 'products/delete',
      summary: `Product deleted: ID ${p.id ?? '?'}`,
      details: payload,
      severity: 'warning',
    });
  },

  'inventory_levels/update': async (payload) => {
    const p = payload as ShopifyInventoryPayload;
    const qty = p.available ?? null;
    const isLow = qty !== null && qty <= LOW_STOCK_THRESHOLD;

    saveActivity({
      type: 'webhook',
      topic: 'inventory_levels/update',
      summary: isLow
        ? `⚠ Low stock alert — item ${p.inventory_item_id ?? '?'} has ${qty} units remaining`
        : `Inventory updated — item ${p.inventory_item_id ?? '?'}: ${qty ?? 'unknown'} units`,
      details: payload,
      severity: isLow ? 'warning' : 'info',
    });
  },

  'customers/create': async (payload) => {
    const p = payload as ShopifyCustomerPayload;
    const name =
      p.first_name || p.last_name
        ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
        : (p.email ?? `ID ${p.id ?? '?'}`);

    saveActivity({
      type: 'webhook',
      topic: 'customers/create',
      summary: `New customer registered: ${name}`,
      details: payload,
      severity: 'info',
    });
  },

  'customers/update': async (payload) => {
    const p = payload as ShopifyCustomerPayload;
    const name =
      p.first_name || p.last_name
        ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
        : (p.email ?? `ID ${p.id ?? '?'}`);

    saveActivity({
      type: 'webhook',
      topic: 'customers/update',
      summary: `Customer updated: ${name}`,
      details: payload,
      severity: 'info',
    });
  },
};

// ─── Dispatcher ───────────────────────────────────────────────────────────────

/**
 * Process an incoming webhook.
 * Runs the topic-specific handler (if any) and always saves a fallback
 * activity entry for unhandled topics.
 */
export async function processWebhook(topic: string, payload: unknown): Promise<void> {
  const handler = handlers[topic];

  if (handler) {
    try {
      await handler(payload);
    } catch (err) {
      console.error(`[webhooks/handlers] Error handling topic "${topic}":`, err);
      // Still log — a failed handler shouldn't swallow the event
      saveActivity({
        type: 'webhook',
        topic,
        summary: `Webhook received: ${topic} (handler error)`,
        details: payload,
        severity: 'error',
      });
    }
    return;
  }

  // Fallback: log unhandled topics as generic info
  saveActivity({
    type: 'webhook',
    topic,
    summary: `Webhook received: ${topic}`,
    details: payload,
    severity: 'info',
  });
}
