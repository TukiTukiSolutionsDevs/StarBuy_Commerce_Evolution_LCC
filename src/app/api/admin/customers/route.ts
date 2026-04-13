/**
 * Admin Customers API
 *
 * GET  /api/admin/customers — list/search customers
 * POST /api/admin/customers — create customer
 */

import type { NextRequest } from 'next/server';
import { searchCustomers, createCustomer } from '@/lib/shopify/admin/tools/customers';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// ─── Auth helper ───────────────────────────────────────────────────────────────

async function requireAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  return !!token && !!(await verifyAdminToken(token));
}

// ─── GET — list / search customers ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? '';
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    const customers = await searchCustomers(query, limit);
    return Response.json({ customers });
  } catch (err) {
    console.error('[api/admin/customers GET]', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch customers';
    return Response.json({ error: message }, { status: 500 });
  }
}

// ─── POST — create customer ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      tags?: string[];
      note?: string;
      acceptsMarketing?: boolean;
    };

    if (!body.email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const result = await createCustomer(body);

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    return Response.json({ customer: result.customer }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/customers POST]', err);
    return Response.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
