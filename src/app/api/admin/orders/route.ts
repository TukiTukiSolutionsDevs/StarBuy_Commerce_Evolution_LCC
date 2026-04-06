/**
 * Admin Orders API
 *
 * GET /api/admin/orders — returns orders from Shopify Admin API
 *
 * Query params:
 *   status  — order status filter (e.g. "unfulfilled")
 *   limit   — number of orders to return (default 50)
 *   days    — filter to last N days (default 30)
 */

import type { NextRequest } from 'next/server';
import { searchOrders } from '@/lib/shopify/admin/tools/orders';
import type { AdminOrder } from '@/lib/shopify/admin/tools/orders';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await verifyAdminToken(token);
  if (!payload) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 250);
  const days = parseInt(searchParams.get('days') ?? '30', 10);

  try {
    // Build date-range query for Shopify Admin API
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceIso = sinceDate.toISOString();

    // Combine date filter with optional status
    let query = `created_at:>=${sinceIso}`;
    if (status) {
      query += ` fulfillment_status:${status}`;
    }

    const orders: AdminOrder[] = await searchOrders(query, limit, undefined);

    return Response.json({ orders });
  } catch (err) {
    console.error('[api/admin/orders GET]', err);
    return Response.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
