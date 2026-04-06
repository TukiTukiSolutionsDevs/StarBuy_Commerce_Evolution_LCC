/**
 * Admin Order — Cancel
 *
 * POST /api/admin/orders/[id]/cancel — cancel an order
 *
 * Body: { reason, restock, refund }
 */

import type { NextRequest } from 'next/server';
import { cancelOrder } from '@/lib/shopify/admin/tools/orders';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
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
    const body = (await request.json()) as {
      reason: string;
      restock: boolean;
      refund: boolean;
      notifyCustomer?: boolean;
    };

    const result = await cancelOrder(id, body.reason, body.restock, body.refund);

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    return Response.json({ order: result.order });
  } catch (err) {
    console.error('[api/admin/orders/[id]/cancel POST]', err);
    return Response.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
