/**
 * Admin Inventory API
 *
 * GET   /api/admin/inventory?productId=xxx — get inventory levels
 * PATCH /api/admin/inventory — set inventory quantity
 */

import type { NextRequest } from 'next/server';
import {
  getInventoryLevels,
  setInventoryQuantity,
} from '@/lib/shopify/admin/tools/inventory';

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
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return Response.json({ error: 'productId is required' }, { status: 400 });
    }

    const inventory = await getInventoryLevels(productId);
    return Response.json({ inventory });
  } catch (err) {
    console.error('[api/admin/inventory GET]', err);
    return Response.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      productId?: string;
      quantity?: number;
      locationId?: string;
    };

    if (!body.productId || body.quantity === undefined) {
      return Response.json(
        { error: 'productId and quantity are required' },
        { status: 400 }
      );
    }

    const result = await setInventoryQuantity(
      body.productId,
      body.quantity,
      body.locationId
    );

    if (!result.success) {
      return Response.json({ error: result.message }, { status: 422 });
    }

    return Response.json({ success: true, message: result.message });
  } catch (err) {
    console.error('[api/admin/inventory PATCH]', err);
    return Response.json({ error: 'Failed to update inventory' }, { status: 500 });
  }
}
