/**
 * Admin Discount — Single Resource
 *
 * PATCH  /api/admin/discounts/[id] — update discount code
 * DELETE /api/admin/discounts/[id] — delete discount code
 */

import type { NextRequest } from 'next/server';
import { deleteDiscount, updateDiscount } from '@/lib/shopify/admin/tools/discounts';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// ─── Auth helper ───────────────────────────────────────────────────────────────

async function requireAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  return !!token && !!(await verifyAdminToken(token));
}

// ─── PATCH — update discount ───────────────────────────────────────────────────

type UpdateDiscountBody = {
  title?: string;
  type?: 'percentage' | 'fixed';
  value?: number;
  startsAt?: string;
  endsAt?: string | null;
  usageLimit?: number | null;
  onePerCustomer?: boolean;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const gid = id.startsWith('gid://') ? id : `gid://shopify/DiscountCodeNode/${id}`;

    const body = (await request.json()) as UpdateDiscountBody;

    if (body.value !== undefined && typeof body.value !== 'number') {
      return Response.json({ error: 'Value must be a number' }, { status: 400 });
    }
    if (
      body.type === 'percentage' &&
      body.value !== undefined &&
      (body.value < 1 || body.value > 100)
    ) {
      return Response.json({ error: 'Percentage must be between 1 and 100' }, { status: 400 });
    }

    const result = await updateDiscount({
      id: gid,
      title: body.title,
      type: body.type,
      value: body.value,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      usageLimit: body.usageLimit,
      onePerCustomer: body.onePerCustomer,
    });

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    return Response.json({ discount: result.discount });
  } catch (err) {
    console.error('[api/admin/discounts/[id] PATCH]', err);
    return Response.json({ error: 'Failed to update discount' }, { status: 500 });
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    // id from URL is the numeric part; build the full Shopify GID
    const gid = id.startsWith('gid://') ? id : `gid://shopify/DiscountCodeNode/${id}`;

    const result = await deleteDiscount(gid);

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    if (!result.deleted) {
      return Response.json({ error: 'Discount could not be deleted' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/admin/discounts/[id] DELETE]', err);
    return Response.json({ error: 'Failed to delete discount' }, { status: 500 });
  }
}
