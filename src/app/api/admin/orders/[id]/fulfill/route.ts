/**
 * Admin Order — Fulfill
 *
 * POST /api/admin/orders/[id]/fulfill — create fulfillment for an order
 *
 * Body: { trackingNumber?, trackingUrl?, company? }
 */

import type { NextRequest } from 'next/server';
import { createFulfillment } from '@/lib/shopify/admin/tools/orders';
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
      trackingNumber?: string;
      trackingUrl?: string;
      company?: string;
    };

    const result = await createFulfillment(id, body.trackingNumber, body.trackingUrl, body.company);

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    return Response.json({ fulfillment: result.fulfillment });
  } catch (err) {
    console.error('[api/admin/orders/[id]/fulfill POST]', err);
    return Response.json({ error: 'Failed to create fulfillment' }, { status: 500 });
  }
}
