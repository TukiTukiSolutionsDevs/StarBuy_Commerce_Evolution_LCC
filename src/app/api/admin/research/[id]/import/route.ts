/**
 * POST /api/admin/research/[id]/import
 *
 * Imports a research item to Shopify as a DRAFT product.
 * Saves the resulting shopifyProductId back to the item and sets status = 'imported'.
 *
 * Returns: 200 { item: ResearchItem }
 * Returns: 409 if already imported (shopifyProductId exists)
 * Returns: 404 if item not found
 * Returns: 401 if unauthenticated
 * Returns: 500 on Shopify errors (userErrors or network)
 *
 * Auth: JWT cookie required.
 * Next.js 16: params is a Promise — must await.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getById, update } from '@/lib/research/store';
import { createProduct } from '@/lib/shopify/admin/tools/products';

export const dynamic = 'force-dynamic';

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const item = getById(id);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });

  // ─── Guard: already imported ──────────────────────────────────────────────
  if (item.shopifyProductId) {
    return Response.json(
      { error: 'Already imported', shopifyProductId: item.shopifyProductId },
      { status: 409 },
    );
  }

  // ─── Create Shopify DRAFT product ─────────────────────────────────────────
  try {
    const { product, userErrors } = await createProduct({
      title: item.keyword,
      price: String(item.salePrice),
      status: 'DRAFT',
      tags: item.relatedKeywords ?? [],
    });

    if (userErrors.length > 0 || !product) {
      console.error('[api/admin/research/[id]/import POST] Shopify userErrors:', userErrors);
      return Response.json(
        { error: 'Failed to create Shopify product', details: userErrors },
        { status: 500 },
      );
    }

    // product.id is a Shopify GID, e.g. "gid://shopify/Product/12345"
    const shopifyProductId = product.id;

    const updated = update(id, {
      shopifyProductId,
      status: 'imported',
    });

    return Response.json({ item: updated });
  } catch (err) {
    console.error('[api/admin/research/[id]/import POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
