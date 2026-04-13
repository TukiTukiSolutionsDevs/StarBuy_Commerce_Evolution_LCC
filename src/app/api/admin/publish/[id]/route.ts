/**
 * GET    /api/admin/publish/[id] — Get single publish record
 * DELETE /api/admin/publish/[id] — Rollback published product to DRAFT
 *
 * Auth: JWT cookie required on both handlers.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getById } from '@/lib/publish/store';
import { rollbackPublish } from '@/lib/publish/rollback';

export const dynamic = 'force-dynamic';

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const record = getById(id);
  if (!record) return Response.json({ error: `PublishRecord ${id} not found` }, { status: 404 });

  return Response.json({ record });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const record = getById(id);
  if (!record) return Response.json({ error: `PublishRecord ${id} not found` }, { status: 404 });

  if (record.status !== 'published') {
    return Response.json(
      { error: `Cannot rollback record with status '${record.status}' — must be 'published'` },
      { status: 400 },
    );
  }

  try {
    const result = await rollbackPublish(id);
    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    const updated = getById(id);
    return Response.json({ record: updated });
  } catch (err) {
    console.error('[api/admin/publish/[id] DELETE]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
