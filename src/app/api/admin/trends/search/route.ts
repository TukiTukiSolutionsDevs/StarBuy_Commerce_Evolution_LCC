/**
 * POST /api/admin/trends/search
 *
 * Search trends for a list of keywords using the configured aggregation strategy.
 *
 * Body:    { keywords: string[], state?: string, category?: string }
 * Returns: { results: AggregatedTrendResult[], strategy: string, providers: string[] }
 * Auth:    JWT cookie required.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { searchTrends, readConfig } from '@/lib/trends';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyAdminToken(token);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // ─── Parse ─────────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { keywords, state, category } = body as {
    keywords?: unknown;
    state?: unknown;
    category?: unknown;
  };

  // ─── Validate ──────────────────────────────────────────────────────────────
  if (
    !Array.isArray(keywords) ||
    keywords.length === 0 ||
    keywords.some((k) => typeof k !== 'string')
  ) {
    return Response.json(
      { error: 'keywords must be a non-empty array of strings' },
      { status: 400 },
    );
  }

  // ─── Execute ───────────────────────────────────────────────────────────────
  try {
    const results = await searchTrends(keywords as string[], {
      region: typeof state === 'string' ? state : undefined,
      categoryId: typeof category === 'string' ? category : undefined,
    });

    const config = readConfig();
    const providers = [...new Set(results.flatMap((r) => r.sources))];

    return Response.json({
      results,
      strategy: config.activeStrategy,
      providers,
    });
  } catch (err) {
    console.error('[api/admin/trends/search POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
