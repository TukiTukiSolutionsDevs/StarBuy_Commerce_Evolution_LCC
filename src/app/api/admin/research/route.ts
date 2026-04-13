/**
 * GET  /api/admin/research — List research items
 *   ?status=candidate|saved|rejected|imported  (optional filter)
 *   ?sort=aiScore&order=desc|asc               (optional sort)
 *
 * POST /api/admin/research — Add a new research item
 *   Body: AddResearchItemInput
 *   Validates: salePrice > costPrice > 0
 *
 * Auth: JWT cookie required on both handlers.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getAll, getByStatus, add } from '@/lib/research/store';
import type { ResearchItem, ResearchItemStatus, AddResearchItemInput } from '@/lib/research/types';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: ResearchItemStatus[] = ['candidate', 'saved', 'discarded', 'imported'];

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

function getAiScoreValue(item: ResearchItem): number {
  const score = item.aiScore;
  if (typeof score === 'number') return score;
  if (score && typeof score === 'object' && 'total' in score) {
    return (score as { total: number }).total;
  }
  return 0;
}

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') as ResearchItemStatus | null;
    const sort = searchParams.get('sort');
    const order = searchParams.get('order') ?? 'asc';

    const validStatus = statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : null;

    let items: ResearchItem[] = validStatus ? getByStatus(validStatus) : getAll();

    if (sort === 'aiScore') {
      items = [...items].sort((a, b) =>
        order === 'desc'
          ? getAiScoreValue(b) - getAiScoreValue(a)
          : getAiScoreValue(a) - getAiScoreValue(b),
      );
    }

    return Response.json({ items });
  } catch (err) {
    console.error('[api/admin/research GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { keyword, salePrice, costPrice } = body as {
    keyword?: unknown;
    salePrice?: unknown;
    costPrice?: unknown;
  };

  if (typeof keyword !== 'string' || !keyword.trim()) {
    return Response.json({ error: 'keyword is required' }, { status: 400 });
  }

  if (typeof costPrice !== 'number' || costPrice <= 0) {
    return Response.json({ error: 'costPrice must be a positive number' }, { status: 400 });
  }

  if (typeof salePrice !== 'number' || salePrice <= costPrice) {
    return Response.json({ error: 'salePrice must be greater than costPrice' }, { status: 400 });
  }

  try {
    const item = add(body as AddResearchItemInput);
    return Response.json({ item }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/research POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
