/**
 * Admin Order — Single Resource
 *
 * GET /api/admin/orders/[id] — return full order detail
 */

import type { NextRequest } from 'next/server';
import { getOrderById } from '@/lib/shopify/admin/tools/orders';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await verifyAdminToken(token);
  if (!payload) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const order = await getOrderById(id);

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    return Response.json({ order });
  } catch (err) {
    console.error('[api/admin/orders/[id] GET]', err);
    return Response.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
