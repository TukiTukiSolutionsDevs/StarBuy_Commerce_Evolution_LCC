/**
 * Admin Collections API
 *
 * GET /api/admin/collections — list collections
 */

import type { NextRequest } from 'next/server';
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    const collections = await listCollections(limit);
    return Response.json({ collections });
  } catch (err) {
    console.error('[api/admin/collections GET]', err);
    return Response.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}
