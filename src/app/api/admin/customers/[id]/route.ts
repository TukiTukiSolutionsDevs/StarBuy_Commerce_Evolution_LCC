/**
 * Admin Customer — Single Resource
 *
 * GET    /api/admin/customers/[id] — get customer
 * PATCH  /api/admin/customers/[id] — update customer (tags, note, etc.)
 * DELETE /api/admin/customers/[id] — delete customer
 */

import type { NextRequest } from 'next/server';
import {
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from '@/lib/shopify/admin/tools/customers';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// ─── Auth helper ───────────────────────────────────────────────────────────────

async function requireAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  return !!token && !!(await verifyAdminToken(token));
}

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const customer = await getCustomerById(id);

    if (!customer) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    return Response.json({ customer });
  } catch (err) {
    console.error('[api/admin/customers/[id] GET]', err);
    return Response.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

// ─── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      tags?: string[];
      note?: string;
      acceptsMarketing?: boolean;
    };

    const result = await updateCustomer(id, body);

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    return Response.json({ customer: result.customer });
  } catch (err) {
    console.error('[api/admin/customers/[id] PATCH]', err);
    return Response.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const result = await deleteCustomer(id);

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    if (!result.deleted) {
      return Response.json({ error: 'Customer could not be deleted' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/admin/customers/[id] DELETE]', err);
    return Response.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
