/**
 * Admin Discounts API
 *
 * GET  /api/admin/discounts — list discount codes
 * POST /api/admin/discounts — create discount code
 */

import type { NextRequest } from 'next/server';
import { listDiscounts, createDiscountCode } from '@/lib/shopify/admin/tools/discounts';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// ─── Auth helper ───────────────────────────────────────────────────────────────

async function requireAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  return !!token && !!(await verifyAdminToken(token));
}

// ─── GET — list discounts ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    const discounts = await listDiscounts(limit);
    return Response.json({ discounts });
  } catch (err) {
    console.error('[api/admin/discounts GET]', err);
    return Response.json({ error: 'Failed to fetch discounts' }, { status: 500 });
  }
}

// ─── POST — create discount code ───────────────────────────────────────────────

type CreateDiscountBody = {
  title: string;
  code: string;
  percentage: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
};

export async function POST(request: NextRequest) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateDiscountBody;

    if (!body.title?.trim()) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!body.code?.trim()) {
      return Response.json({ error: 'Code is required' }, { status: 400 });
    }
    if (typeof body.percentage !== 'number' || body.percentage < 1 || body.percentage > 100) {
      return Response.json({ error: 'Percentage must be between 1 and 100' }, { status: 400 });
    }

    const result = await createDiscountCode({
      title: body.title.trim(),
      code: body.code.trim().toUpperCase(),
      percentage: body.percentage,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      usageLimit: body.usageLimit,
    });

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    return Response.json({ discount: result.discount }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/discounts POST]', err);
    return Response.json({ error: 'Failed to create discount' }, { status: 500 });
  }
}
