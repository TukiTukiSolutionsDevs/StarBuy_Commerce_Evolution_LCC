/**
 * POST /api/admin/trends/test
 *
 * Test a provider connection.
 *
 * Body:    { providerId: ProviderId }
 * Returns: { success: boolean, latency: number, error?: string }
 * Auth:    JWT cookie required.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { testProvider } from '@/lib/trends';
import type { ProviderId } from '@/lib/trends';

export const dynamic = 'force-dynamic';

const VALID_PROVIDERS: ProviderId[] = ['serpapi', 'pytrends', 'tavily', 'amazon', 'meta'];

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyAdminToken(token);
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

  const { providerId } = body as { providerId?: unknown };

  if (typeof providerId !== 'string' || !VALID_PROVIDERS.includes(providerId as ProviderId)) {
    return Response.json(
      { error: `providerId must be one of: ${VALID_PROVIDERS.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const result = await testProvider(providerId as ProviderId);
    return Response.json({
      success: result.ok,
      latency: result.latencyMs ?? 0,
      error: result.error,
    });
  } catch (err) {
    console.error('[api/admin/trends/test POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
