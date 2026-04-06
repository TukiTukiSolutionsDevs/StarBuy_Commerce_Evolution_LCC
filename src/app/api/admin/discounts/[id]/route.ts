/**
 * Admin Discount — Single Resource
 *
 * DELETE /api/admin/discounts/[id] — delete discount code
 */

import type { NextRequest } from 'next/server';
import { deleteDiscount } from '@/lib/shopify/admin/tools/discounts';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// ─── Auth helper ───────────────────────────────────────────────────────────────

async function requireAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  return !!token && !!(await verifyAdminToken(token));
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
