/**
 * GET /api/admin/monitor/[shopifyId] — Get single product metrics
 *
 * Auth: JWT cookie required.
 * Note: shopifyId is URL-encoded (Shopify GIDs contain slashes and colons).
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getMetricsByShopifyId } from '@/lib/monitor/store';

export const dynamic = 'force-dynamic';

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopifyId: string }> },
) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { shopifyId } = await params;
    const decoded = decodeURIComponent(shopifyId);

    const metrics = getMetricsByShopifyId(decoded);
    if (!metrics) {
      return Response.json({ error: `Metrics for ${decoded} not found` }, { status: 404 });
    }

    return Response.json({ metrics });
  } catch (err) {
    console.error('[api/admin/monitor/[shopifyId] GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
