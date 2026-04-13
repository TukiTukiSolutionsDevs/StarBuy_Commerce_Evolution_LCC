/**
 * PATCH  /api/admin/research/[id] — update research item
 * DELETE /api/admin/research/[id] — hard delete
 *
 * Auth: JWT cookie required on both handlers.
 * Next.js 16: params is a Promise — must await.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getById, update, remove } from '@/lib/research/store';
import type { UpdateResearchItemInput } from '@/lib/research/types';

export const dynamic = 'force-dynamic';

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

// ─── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const existing = getById(id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const patch = body as UpdateResearchItemInput;

  // ─── Validate prices if provided ─────────────────────────────────────────────
  if (patch.costPrice !== undefined && patch.costPrice <= 0) {
    return Response.json({ error: 'costPrice must be a positive number' }, { status: 400 });
  }
  if (patch.salePrice !== undefined && patch.salePrice <= 0) {
    return Response.json({ error: 'salePrice must be a positive number' }, { status: 400 });
  }

  const effectiveCost = patch.costPrice ?? existing.costPrice;
  const effectiveSale = patch.salePrice ?? existing.salePrice;
  if (effectiveSale <= effectiveCost) {
    return Response.json({ error: 'salePrice must be greater than costPrice' }, { status: 400 });
  }

  // ─── Execute ─────────────────────────────────────────────────────────────────
  try {
    const item = update(id, patch);
    return Response.json({ item });
  } catch (err) {
    console.error('[api/admin/research/[id] PATCH]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const existing = getById(id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  try {
    remove(id);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('[api/admin/research/[id] DELETE]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
