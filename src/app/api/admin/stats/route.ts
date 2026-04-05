/**
 * Admin Stats API
 *
 * GET /api/admin/stats — returns dashboard stats
 * (total products, collections, inventory units)
 */

import type { NextRequest } from 'next/server';
import { searchProducts } from '@/lib/shopify/admin/tools/products';
import { listCollections } from '@/lib/shopify/admin/tools/collections';

export const dynamic = 'force-dynamic';

function makeExpectedToken(password: string): string {
  const payload = `starbuy-admin:${password}:${process.env.NODE_ENV}`;
  return Buffer.from(payload).toString('base64');
}

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_CHAT_PASSWORD;
  if (!adminPassword) return false;

  const token = request.cookies.get('admin_token')?.value;
  if (!token) return false;

  return token === makeExpectedToken(adminPassword);
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch in parallel
    const [products, collections] = await Promise.all([
      searchProducts('', 250),
      listCollections(50),
    ]);

    // Aggregate total inventory from variants
    let totalInventoryUnits = 0;
    for (const product of products) {
      for (const edge of product.variants.edges) {
        const qty = edge.node.inventoryQuantity;
        if (typeof qty === 'number' && qty > 0) {
          totalInventoryUnits += qty;
        }
      }
    }

    return Response.json({
      stats: {
        totalProducts: products.length,
        totalCollections: collections.length,
        totalInventoryUnits,
        storeStatus: 'online',
      },
    });
  } catch (err) {
    console.error('[api/admin/stats GET]', err);
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
