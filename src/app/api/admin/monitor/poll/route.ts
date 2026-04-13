/**
 * POST /api/admin/monitor/poll — Trigger product metrics poll
 *
 * Auth: JWT cookie OR x-vercel-cron: "1" header (Vercel Cron bypass).
 * Body (optional): { shopifyProductId?: string }
 *   - omit or empty → poll all published products via pollAllProducts()
 *   - shopifyProductId present → poll single product via pollSingleProduct()
 *
 * Always returns 200 { result: PollResult } even on single-product errors
 * (errors surface inside result.errors[]).
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { pollAllProducts, pollSingleProduct } from '@/lib/monitor/poller';
import type { PollResult } from '@/lib/monitor/types';

export const dynamic = 'force-dynamic';

async function authenticate(request: NextRequest): Promise<boolean> {
  // Vercel Cron bypass — header is set by the Vercel platform
  if (request.headers.get('x-vercel-cron') === '1') return true;

  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return false;
  const payload = await verifyAdminToken(token);
  return payload !== null;
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authorized = await authenticate(request);
  if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse optional body — ignore parse errors, treat as empty
  let body: { shopifyProductId?: string } = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as { shopifyProductId?: string };
    }
  } catch {
    // malformed JSON → treat as no body
  }

  try {
    let result: PollResult;

    if (body.shopifyProductId) {
      const start = Date.now();
      try {
        await pollSingleProduct(body.shopifyProductId, body.shopifyProductId);
        result = {
          polled: 1,
          updated: 1,
          errors: [],
          snapshotWritten: true,
          durationMs: Date.now() - start,
        };
      } catch (err) {
        result = {
          polled: 1,
          updated: 0,
          errors: [
            {
              shopifyProductId: body.shopifyProductId,
              error: err instanceof Error ? err.message : String(err),
            },
          ],
          snapshotWritten: false,
          durationMs: Date.now() - start,
        };
      }
    } else {
      result = await pollAllProducts();
    }

    return Response.json({ result });
  } catch (err) {
    console.error('[api/admin/monitor/poll POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
