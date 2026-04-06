/**
 * Admin Inventory API
 *
 * GET   /api/admin/inventory              — all products with inventory data
 * GET   /api/admin/inventory?productId=xx — single product inventory
 * PATCH /api/admin/inventory              — update inventory quantity
 */

import type { NextRequest } from 'next/server';
import {
  getInventoryLevels,
  setInventoryQuantity,
  setInventoryByItemId,
} from '@/lib/shopify/admin/tools/inventory';
import { searchProducts } from '@/lib/shopify/admin/tools/products';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// ─── Auth helper ───────────────────────────────────────────────────────────────

async function isAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return false;
  const payload = await verifyAdminToken(token);
  return payload !== null;
}

// ─── GET — inventory data ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!(await isAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    // Single product mode
    if (productId) {
      const inventory = await getInventoryLevels(productId);
      return Response.json({ inventory });
    }

    // All products mode — fetch up to 250 products then their inventory
    const products = await searchProducts('', 250);

    // Fetch inventory for all products in parallel (batch of 20 at a time)
    const BATCH_SIZE = 20;
    const allInventory: Record<string, Awaited<ReturnType<typeof getInventoryLevels>>> = {};

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map((p) => getInventoryLevels(p.id)));
      results.forEach((inv) => {
        allInventory[inv.productId] = inv;
      });
    }

    // Combine product data with inventory
    const combined = products.map((product) => {
      const inv = allInventory[product.id];
      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        status: product.status,
        vendor: product.vendor,
        featuredImage: product.featuredImage,
        variants: product.variants.edges.map((e) => {
          const variantInventory = inv?.variants.find((v) => v.variantId === e.node.id);
          return {
            variantId: e.node.id,
            variantTitle: e.node.title,
            inventoryItemId: variantInventory?.inventoryItemId ?? null,
            inventoryQuantity: e.node.inventoryQuantity ?? 0,
            levels: variantInventory?.levels ?? [],
          };
        }),
      };
    });

    return Response.json({ products: combined });
  } catch (err) {
    console.error('[api/admin/inventory GET]', err);
    return Response.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

// ─── PATCH — update inventory ──────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  if (!(await isAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      // Option A: update by inventoryItemId (per-variant, per-location)
      inventoryItemId?: string;
      locationId?: string;
      quantity?: number; // absolute value
      delta?: number; // relative adjustment
      // Option B: update all variants of a product (legacy)
      productId?: string;
    };

    // Option A: specific inventoryItemId
    if (body.inventoryItemId && body.locationId) {
      const mode = body.delta !== undefined ? 'adjust' : 'set';
      const value = mode === 'adjust' ? (body.delta as number) : (body.quantity as number);

      if (value === undefined || value === null) {
        return Response.json(
          { error: 'Either quantity (set) or delta (adjust) is required' },
          { status: 400 },
        );
      }

      const result = await setInventoryByItemId(body.inventoryItemId, body.locationId, value, mode);

      if (!result.success) {
        return Response.json({ error: result.message }, { status: 422 });
      }

      return Response.json({ success: true, message: result.message });
    }

    // Option B: legacy — all variants of a product
    if (body.productId && body.quantity !== undefined) {
      const result = await setInventoryQuantity(body.productId, body.quantity, body.locationId);

      if (!result.success) {
        return Response.json({ error: result.message }, { status: 422 });
      }

      return Response.json({ success: true, message: result.message });
    }

    return Response.json(
      {
        error:
          'Invalid body: provide (inventoryItemId + locationId + quantity/delta) or (productId + quantity)',
      },
      { status: 400 },
    );
  } catch (err) {
    console.error('[api/admin/inventory PATCH]', err);
    return Response.json({ error: 'Failed to update inventory' }, { status: 500 });
  }
}
