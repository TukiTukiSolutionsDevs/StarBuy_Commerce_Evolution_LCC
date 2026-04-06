/**
 * Admin Customers API
 *
 * GET  /api/admin/customers — list/search customers
 */

import type { NextRequest } from 'next/server';
import { searchCustomers } from '@/lib/shopify/admin/tools/customers';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// ─── GET — list / search customers ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
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
    return Response.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
