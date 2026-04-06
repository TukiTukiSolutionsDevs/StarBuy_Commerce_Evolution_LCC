/**
 * Admin Product — Single Resource
 *
 * GET    /api/admin/products/[id] — get product
 * PATCH  /api/admin/products/[id] — update product
 * DELETE /api/admin/products/[id] — delete product
 */

import type { NextRequest } from 'next/server';
import {
  getProductById,
  updateProduct,
  deleteProduct,
  setProductPrice,
} from '@/lib/shopify/admin/tools/products';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const product = await getProductById(id);

    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    return Response.json({ product });
  } catch (err) {
    console.error('[api/admin/products/[id] GET]', err);
    return Response.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// ─── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      descriptionHtml?: string;
      vendor?: string;
      productType?: string;
      tags?: string[];
      status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
      price?: string;
    };

    const { price, ...productFields } = body;

    // Only call updateProduct if there are non-price fields to update
    if (Object.keys(productFields).length > 0) {
      const result = await updateProduct(id, productFields);

      if (result.userErrors.length > 0) {
        return Response.json(
          { error: result.userErrors.map((e) => e.message).join(', ') },
          { status: 422 },
        );
      }
    }

    // If a price update is requested, fetch the product to get the variant ID
    if (price !== undefined) {
      const product = await getProductById(id);
      if (!product) {
        return Response.json({ error: 'Product not found' }, { status: 404 });
      }
      const variantId = product.variants.edges[0]?.node.id;
      if (variantId) {
        const priceResult = await setProductPrice(variantId, price);
        if (priceResult.userErrors.length > 0) {
          return Response.json(
            { error: priceResult.userErrors.map((e) => e.message).join(', ') },
            { status: 422 },
          );
        }
      }
    }

    const refreshed = await getProductById(id);
    return Response.json({ product: refreshed });
  } catch (err) {
    console.error('[api/admin/products/[id] PATCH]', err);
    return Response.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const result = await deleteProduct(id);

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    if (!result.deleted) {
      return Response.json({ error: 'Product could not be deleted' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/admin/products/[id] DELETE]', err);
    return Response.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
