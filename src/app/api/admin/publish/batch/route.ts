/**
 * POST /api/admin/publish/batch — Batch publish multiple research items
 *   Body: { ids: string[] } — research item IDs, max 20
 *   Returns: 202 { result: BatchPublishResult }
 *
 * Auth: JWT cookie required.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { batchPublish } from '@/lib/publish/batch';

export const dynamic = 'force-dynamic';

const MAX_BATCH_SIZE = 20;

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function POST(request: NextRequest) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { ids } = (body as { ids?: unknown }) ?? {};

  if (!Array.isArray(ids)) {
    return Response.json({ error: 'ids must be an array' }, { status: 400 });
  }

  if (ids.length === 0) {
    return Response.json({ error: 'ids array cannot be empty' }, { status: 400 });
  }

  if (ids.length > MAX_BATCH_SIZE) {
    return Response.json(
      { error: `Batch size cannot exceed ${MAX_BATCH_SIZE} items` },
      { status: 400 },
    );
  }

  try {
    const result = await batchPublish(ids as string[]);
    return Response.json({ result }, { status: 202 });
  } catch (err) {
    console.error('[api/admin/publish/batch POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
