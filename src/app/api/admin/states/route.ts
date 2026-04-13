/**
 * GET /api/admin/states
 *
 * Returns all 51 US states with their opportunity scores.
 * Auth: JWT cookie required.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { loadScores } from '@/lib/states/store';
import { buildStatesWithScores } from '@/lib/states';

export const dynamic = 'force-dynamic';

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function GET(request: NextRequest) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const scores = loadScores();
    const states = buildStatesWithScores(scores);
    const computedAt = scores.length > 0 ? Math.max(...scores.map((s) => s.computedAt)) : 0;

    return Response.json({ states, computedAt });
  } catch (err) {
    console.error('[api/admin/states GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
