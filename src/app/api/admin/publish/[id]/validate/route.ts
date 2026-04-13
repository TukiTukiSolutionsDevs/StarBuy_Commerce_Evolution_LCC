/**
 * POST /api/admin/publish/[id]/validate — Dry-run validation
 * Returns: 200 { validation, ready }
 * Auth: JWT cookie required.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getById } from '@/lib/publish/store';
import { getById as getResearchById } from '@/lib/research/store';
import { validateForPublish, isReadyToPublish } from '@/lib/publish/validator';

export const dynamic = 'force-dynamic';

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const record = getById(id);
  if (!record) return Response.json({ error: `PublishRecord ${id} not found` }, { status: 404 });

  const researchItem = getResearchById(record.researchId);
  if (!researchItem) {
    return Response.json(
      { error: `Research item ${record.researchId} not found` },
      { status: 404 },
    );
  }

  try {
    const validation = validateForPublish(researchItem);
    const ready = isReadyToPublish(validation);
    return Response.json({ validation, ready });
  } catch (err) {
    console.error('[api/admin/publish/[id]/validate POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
