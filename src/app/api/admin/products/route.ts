/**
 * Admin Products API
 *
 * GET  /api/admin/products — list products
 * POST /api/admin/products — create product
 */

import type { NextRequest } from 'next/server';
import { searchProducts, createProduct } from '@/lib/shopify/admin/tools/products';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// ─── GET — list products ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? '';
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    const products = await searchProducts(query, limit);
    return Response.json({ products });
  } catch (err) {
    console.error('[api/admin/products GET]', err);
    return Response.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// ─── POST — create product ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      descriptionHtml?: string;
      vendor?: string;
      productType?: string;
      tags?: string[];
      status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
      price?: string;
    };

    if (!body.title) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }

    const result = await createProduct(
      body as {
        title: string;
        descriptionHtml?: string;
        vendor?: string;
        productType?: string;
        tags?: string[];
        status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
        price?: string;
      },
    );

    if (result.userErrors.length > 0) {
      return Response.json(
        { error: result.userErrors.map((e) => e.message).join(', ') },
        { status: 422 },
      );
    }

    return Response.json({ product: result.product }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/products POST]', err);
    return Response.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
