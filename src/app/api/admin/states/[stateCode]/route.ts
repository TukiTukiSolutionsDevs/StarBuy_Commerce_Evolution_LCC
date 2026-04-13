/**
 * GET /api/admin/states/[stateCode]
 *
 * Returns full profile for a single US state including score,
 * top trends, and research candidates.
 * Auth: JWT cookie required.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getStateProfile, getScoreByState } from '@/lib/states';
import type { StateDetailResponse } from '@/lib/states/types';

export const dynamic = 'force-dynamic';

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stateCode: string }> },
) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { stateCode } = await params;
    const code = stateCode.toUpperCase();

    const profile = getStateProfile(code);
    if (!profile) {
      return Response.json({ error: `State '${stateCode}' not found` }, { status: 404 });
    }
    const score = getScoreByState(code) ?? {
      stateCode: code,
      score: 0,
      breakdown: { demographics: 0, trendActivity: 0, ecommerceIndex: 0, incomeIndex: 0 },
      topCategories: [],
      computedAt: 0,
    };

    // Top trends: derived from score topCategories
    const topTrends = score.topCategories.map((cat) => ({
      keyword: cat,
      score: 0,
      state: 'unknown',
    }));

    // Research candidates: placeholder — filtered by category in production
    const researchCandidates: StateDetailResponse['researchCandidates'] = [];

    return Response.json({ profile, score, topTrends, researchCandidates });
  } catch (err) {
    console.error('[api/admin/states/[stateCode] GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
