/**
 * GET /api/admin/monitor/[shopifyId]/snapshots — Weekly snapshots for a product
 *   ?limit=12  (default 12, max 52)
 *
 * Returns snapshots sorted by weekStart descending.
 * Auth: JWT cookie required.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getSnapshotsByProduct } from '@/lib/monitor/store';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 52;

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

    const { searchParams } = new URL(request.url);
    const raw = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
    const limit = Math.min(isNaN(raw) || raw < 1 ? DEFAULT_LIMIT : raw, MAX_LIMIT);

    const all = getSnapshotsByProduct(decoded);
    const sorted = [...all].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    const snapshots = sorted.slice(0, limit);

    return Response.json({ snapshots });
  } catch (err) {
    console.error('[api/admin/monitor/[shopifyId]/snapshots GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
