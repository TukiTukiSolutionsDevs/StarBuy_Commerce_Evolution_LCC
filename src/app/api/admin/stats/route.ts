/**
 * Admin Stats API
 *
 * GET /api/admin/stats — returns dashboard stats
 * (total products, collections, inventory units)
 */

import type { NextRequest } from 'next/server';
import { searchProducts } from '@/lib/shopify/admin/tools/products';
import { listCollections } from '@/lib/shopify/admin/tools/collections';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await verifyAdminToken(token);
  if (!payload) {
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
