/**
 * Admin Unified Search API
 *
 * GET /api/admin/search?q=query
 *
 * Searches products, orders, customers, and collections in parallel.
 * Collections have no server-side search, so we fetch all and filter client-side.
 */

import type { NextRequest } from 'next/server';
import { searchProducts } from '@/lib/shopify/admin/tools/products';
import { searchOrders } from '@/lib/shopify/admin/tools/orders';
import { searchCustomers } from '@/lib/shopify/admin/tools/customers';
import { listCollections } from '@/lib/shopify/admin/tools/collections';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (!q) {
    return Response.json({ products: [], orders: [], customers: [], collections: [] });
  }

  try {
    // Run all searches in parallel
    const [products, orders, customers, allCollections] = await Promise.all([
      searchProducts(q, 5),
      searchOrders(q, 5),
      searchCustomers(q, 5),
      listCollections(50),
    ]);

    // Collections have no search API — filter by title match client-side
    const lower = q.toLowerCase();
    const collections = allCollections.filter((c) => c.title.toLowerCase().includes(lower));

    return Response.json({ products, orders, customers, collections });
  } catch (err) {
    console.error('[api/admin/search GET]', err);
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
