/**
 * GET  /api/admin/trends/config — returns current config + provider statuses
 * POST /api/admin/trends/config — updates config (strategy, enabledProviders, cache)
 *
 * Auth: JWT cookie required on both handlers.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { readConfig, saveConfig, getAvailableProviders, AggregationStrategy } from '@/lib/trends';
import type { ProviderId, TrendConfig } from '@/lib/trends';

export const dynamic = 'force-dynamic';

const VALID_STRATEGIES = Object.values(AggregationStrategy) as string[];
const VALID_PROVIDERS: ProviderId[] = ['serpapi', 'pytrends', 'tavily', 'amazon', 'meta'];

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const config = readConfig();
    const providers = getAvailableProviders();
    return Response.json({ config, providers });
  } catch (err) {
    console.error('[api/admin/trends/config GET]', err);
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

  const { strategy, enabledProviders, cacheEnabled, cacheTTL } = body as {
    strategy?: unknown;
    enabledProviders?: unknown;
    cacheEnabled?: unknown;
    cacheTTL?: unknown;
  };

  const partial: Partial<TrendConfig> = {};

  if (strategy !== undefined) {
    if (!VALID_STRATEGIES.includes(strategy as string)) {
      return Response.json(
        { error: `strategy must be one of: ${VALID_STRATEGIES.join(', ')}` },
        { status: 400 },
      );
    }
    partial.activeStrategy = strategy as TrendConfig['activeStrategy'];
  }

  if (enabledProviders !== undefined) {
    if (
      !Array.isArray(enabledProviders) ||
      enabledProviders.some((p) => !VALID_PROVIDERS.includes(p as ProviderId))
    ) {
      return Response.json(
        { error: `enabledProviders must be an array of: ${VALID_PROVIDERS.join(', ')}` },
        { status: 400 },
      );
    }
    partial.enabledProviders = enabledProviders as ProviderId[];
  }

  if (cacheEnabled !== undefined) {
    if (typeof cacheEnabled !== 'boolean') {
      return Response.json({ error: 'cacheEnabled must be a boolean' }, { status: 400 });
    }
    partial.cacheEnabled = cacheEnabled;
  }

  if (cacheTTL !== undefined) {
    if (typeof cacheTTL !== 'number' || cacheTTL <= 0) {
      return Response.json({ error: 'cacheTTL must be a positive number (ms)' }, { status: 400 });
    }
    partial.cacheTTL = cacheTTL;
  }

  try {
    const updated = saveConfig(partial);
    return Response.json({ config: updated });
  } catch (err) {
    console.error('[api/admin/trends/config POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
