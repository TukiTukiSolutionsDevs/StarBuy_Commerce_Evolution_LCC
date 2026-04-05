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
} from '@/lib/shopify/admin/tools/products';

export const dynamic = 'force-dynamic';

// ─── Auth helper ───────────────────────────────────────────────────────────────

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

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAdminAuthenticated(request)) {
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
  if (!isAdminAuthenticated(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json() as {
      title?: string;
      descriptionHtml?: string;
      vendor?: string;
      productType?: string;
      tags?: string[];
      status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
    };

    const result = await updateProduct(id, body);

    if (result.errors.length > 0) {
      return Response.json(
        { error: result.errors.map((e) => e.message).join(', ') },
        { status: 422 }
      );
    }

    return Response.json({ product: result.product });
  } catch (err) {
    console.error('[api/admin/products/[id] PATCH]', err);
    return Response.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAdminAuthenticated(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const result = await deleteProduct(id);

    if (result.errors.length > 0) {
      return Response.json(
        { error: result.errors.map((e) => e.message).join(', ') },
        { status: 422 }
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
