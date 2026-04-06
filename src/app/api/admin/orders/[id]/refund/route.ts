/**
 * Admin Order — Refund
 *
 * POST /api/admin/orders/[id]/refund — refund an order
 *
 * Body: { lineItems?: { lineItemId, quantity, restockType? }[], note? }
 */

import type { NextRequest } from 'next/server';
import { refundOrder } from '@/lib/shopify/admin/tools/orders';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

type RefundLineItemBody = {
  lineItemId: string;
  quantity: number;
  restockType?: 'RETURN' | 'CANCEL' | 'NO_RESTOCK';
};

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
      lineItems?: RefundLineItemBody[];
      note?: string;
    };

    const result = await refundOrder(id, body.lineItems, body.note);

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    return Response.json({ refund: result.refund });
  } catch (err) {
    console.error('[api/admin/orders/[id]/refund POST]', err);
    return Response.json({ error: 'Failed to process refund' }, { status: 500 });
  }
}
