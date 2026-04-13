/**
 * GET /api/admin/monitor — List all product metrics
 *   ?health=healthy|warning|critical|unknown  (optional filter)
 *
 * Auth: JWT cookie required.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { loadAllMetrics } from '@/lib/monitor/store';
import type { HealthStatus } from '@/lib/monitor/types';

export const dynamic = 'force-dynamic';

const VALID_HEALTH: HealthStatus[] = ['healthy', 'warning', 'critical', 'unknown'];

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
    const healthParam = searchParams.get('health') as HealthStatus | null;
    const validHealth = healthParam && VALID_HEALTH.includes(healthParam) ? healthParam : null;

    const allMetrics = loadAllMetrics();
    const metrics = validHealth ? allMetrics.filter((m) => m.health === validHealth) : allMetrics;

    return Response.json({ metrics });
  } catch (err) {
    console.error('[api/admin/monitor GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
