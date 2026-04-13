/**
 * GET  /api/admin/publish — List publish records
 *   ?status=pending|validating|publishing|published|failed|rollback|archived  (optional)
 *
 * POST /api/admin/publish — Create a publish record and trigger the pipeline
 *   Body: { researchId: string }
 *   Returns: 201 { record }
 *
 * Auth: JWT cookie required on both handlers.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getAll, getByStatus, add, getByResearchId } from '@/lib/publish/store';
import { executePipeline } from '@/lib/publish/pipeline';
import { getById as getResearchById } from '@/lib/research/store';
import type { PublishStatus } from '@/lib/publish/types';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: PublishStatus[] = [
  'pending',
  'validating',
  'publishing',
  'published',
  'failed',
  'rollback',
  'archived',
];

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') as PublishStatus | null;
    const validStatus = statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : null;
    const records = validStatus ? getByStatus(validStatus) : getAll();
    return Response.json({ records });
  } catch (err) {
    console.error('[api/admin/publish GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { researchId } = (body as { researchId?: unknown }) ?? {};

  if (typeof researchId !== 'string' || !researchId.trim()) {
    return Response.json({ error: 'researchId is required' }, { status: 400 });
  }

  // Verify research item exists
  const researchItem = getResearchById(researchId);
  if (!researchItem) {
    return Response.json({ error: `Research item ${researchId} not found` }, { status: 404 });
  }

  // Prevent duplicate active publish
  const existing = getByResearchId(researchId);
  if (existing && existing.status !== 'failed' && existing.status !== 'archived') {
    return Response.json(
      { error: `Research item ${researchId} is already published or in progress` },
      { status: 400 },
    );
  }

  try {
    const record = add({ researchId });
    // Fire pipeline — client polls GET /api/admin/publish/[id] for status
    void executePipeline(record.id);
    return Response.json({ record }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/publish POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
