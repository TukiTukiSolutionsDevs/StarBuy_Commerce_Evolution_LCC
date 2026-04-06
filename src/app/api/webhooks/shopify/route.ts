/**
 * Shopify Webhook Receiver
 *
 * POST /api/webhooks/shopify
 *
 * 1. Reads raw body (needed for HMAC calculation)
 * 2. Verifies HMAC-SHA256 signature from x-shopify-hmac-sha256 header
 * 3. Returns 200 immediately (Shopify requires response within 5s)
 * 4. Dispatches processing asynchronously via processWebhook()
 *
 * Env vars:
 *   SHOPIFY_WEBHOOK_SECRET — preferred dedicated webhook secret
 *   SHOPIFY_CLIENT_SECRET  — fallback (used when no dedicated secret set)
 */

import { createHmac } from 'crypto';
import { processWebhook } from '@/lib/webhooks/handlers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  // ── 1. Read raw body ───────────────────────────────────────────────────────
  const rawBody = await request.text();

  // ── 2. Verify HMAC-SHA256 ──────────────────────────────────────────────────
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET ?? process.env.SHOPIFY_CLIENT_SECRET ?? '';

  if (!secret) {
    console.error('[webhooks/shopify] No webhook secret configured');
    return new Response('Server configuration error', { status: 500 });
  }

  const hash = createHmac('sha256', secret).update(rawBody).digest('base64');

  if (!hmacHeader || hash !== hmacHeader) {
    console.warn('[webhooks/shopify] HMAC verification failed');
    return new Response('Unauthorized', { status: 401 });
  }

  // ── 3. Parse topic ─────────────────────────────────────────────────────────
  const topic = request.headers.get('x-shopify-topic') ?? '';

  if (!topic) {
    return new Response('Missing x-shopify-topic header', { status: 400 });
  }

  // ── 4. Respond 200 immediately ─────────────────────────────────────────────
  // Shopify requires a 200 response within 5 seconds.
  // All processing happens async after this point.

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = rawBody;
  }

  // Fire and forget — do NOT await
  processWebhook(topic, payload).catch((err) => {
    console.error('[webhooks/shopify] processWebhook error:', err);
  });

  return new Response('OK', { status: 200 });
}
