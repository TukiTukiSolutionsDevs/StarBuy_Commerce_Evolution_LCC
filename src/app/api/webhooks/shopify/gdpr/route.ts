/**
 * Shopify GDPR Mandatory Webhooks
 *
 * POST /api/webhooks/shopify/gdpr
 *
 * Handles the three mandatory GDPR webhooks required by Shopify for app approval.
 * Topic is read from x-shopify-topic header.
 *
 * Topics handled:
 *   customers/data_request — customer requests their data export
 *   customers/redact       — customer requests deletion of their data
 *   shop/redact            — shop owner requests deletion after uninstall
 *
 * Policy: We don't store PII beyond what Shopify holds, so all requests
 * acknowledge with { success: true } and an audit log entry.
 */

import { createHmac } from 'crypto';
import { saveActivity } from '@/lib/webhooks/activity-log';

export const dynamic = 'force-dynamic';

// ─── Payload types ─────────────────────────────────────────────────────────────

interface CustomerDataRequestPayload {
  shop_id?: number;
  shop_domain?: string;
  customer?: { id?: number; email?: string };
  orders_requested?: number[];
}

interface CustomerRedactPayload {
  shop_id?: number;
  shop_domain?: string;
  customer?: { id?: number; email?: string };
  orders_to_redact?: number[];
}

interface ShopRedactPayload {
  shop_id?: number;
  shop_domain?: string;
}

// ─── Handler ───────────────────────────────────────────────────────────────────

async function handleGdprTopic(topic: string, payload: unknown): Promise<void> {
  switch (topic) {
    case 'customers/data_request': {
      const p = payload as CustomerDataRequestPayload;
      saveActivity({
        type: 'system',
        topic,
        summary: `GDPR data request for customer ${p.customer?.email ?? p.customer?.id ?? '?'} on ${p.shop_domain ?? 'unknown shop'}`,
        details: payload,
        severity: 'info',
      });
      break;
    }

    case 'customers/redact': {
      const p = payload as CustomerRedactPayload;
      saveActivity({
        type: 'system',
        topic,
        summary: `GDPR redact request for customer ${p.customer?.email ?? p.customer?.id ?? '?'} on ${p.shop_domain ?? 'unknown shop'}`,
        details: payload,
        severity: 'warning',
      });
      break;
    }

    case 'shop/redact': {
      const p = payload as ShopRedactPayload;
      saveActivity({
        type: 'system',
        topic,
        summary: `GDPR shop redact request for ${p.shop_domain ?? `shop ID ${p.shop_id ?? '?'}`}`,
        details: payload,
        severity: 'warning',
      });
      break;
    }

    default:
      saveActivity({
        type: 'system',
        topic,
        summary: `GDPR webhook received: ${topic}`,
        details: payload,
        severity: 'info',
      });
  }
}

// ─── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Read raw body ──────────────────────────────────────────────────────────
  const rawBody = await request.text();

  // ── Verify HMAC ────────────────────────────────────────────────────────────
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET ?? process.env.SHOPIFY_CLIENT_SECRET ?? '';

  if (!secret) {
    return Response.json({ success: false, error: 'Server configuration error' }, { status: 500 });
  }

  const hash = createHmac('sha256', secret).update(rawBody).digest('base64');

  if (!hmacHeader || hash !== hmacHeader) {
    console.warn('[webhooks/shopify/gdpr] HMAC verification failed');
    return new Response('Unauthorized', { status: 401 });
  }

  // ── Parse topic + payload ──────────────────────────────────────────────────
  const topic = request.headers.get('x-shopify-topic') ?? '';

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = {};
  }

  // ── Respond 200 immediately ────────────────────────────────────────────────
  handleGdprTopic(topic, payload).catch((err) => {
    console.error('[webhooks/shopify/gdpr] Handler error:', err);
  });

  return Response.json({ success: true }, { status: 200 });
}
