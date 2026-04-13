/**
 * GET /api/admin/states/compare?codes=CA,TX,NY
 *
 * Compare 2-3 US states side by side.
 * Auth: JWT cookie required.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getStateProfile, getScoreByState } from '@/lib/states';
import type { StateWithScore } from '@/lib/states/types';

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
    const url = new URL(request.url);
    const codesParam = url.searchParams.get('codes');

    if (!codesParam) {
      return Response.json(
        { error: 'Missing required query param: codes (e.g. ?codes=CA,TX,NY)' },
        { status: 400 },
      );
    }

    const codes = codesParam
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (codes.length < 2 || codes.length > 3) {
      return Response.json(
        { error: 'Must compare 2 or 3 states (e.g. ?codes=CA,TX)' },
        { status: 400 },
      );
    }

    const states: StateWithScore[] = [];
    for (const code of codes) {
      const profile = getStateProfile(code);
      if (!profile) {
        return Response.json({ error: `State '${code}' not found` }, { status: 404 });
      }

      const score = getScoreByState(code) ?? {
        stateCode: code,
        score: 0,
        breakdown: { demographics: 0, trendActivity: 0, ecommerceIndex: 0, incomeIndex: 0 },
        topCategories: [],
        computedAt: 0,
      };

      states.push({ ...profile, opportunityScore: score });
    }

    return Response.json({ states });
  } catch (err) {
    console.error('[api/admin/states/compare GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
