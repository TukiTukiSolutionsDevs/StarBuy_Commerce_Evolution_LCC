/**
 * Admin Activity Log API
 *
 * GET  /api/admin/activity   — list activity events
 * DELETE /api/admin/activity — clear all activity events
 *
 * Query params (GET):
 *   limit  — max events to return (default 50, max 500)
 *   type   — filter by event type: webhook | user_action | automation | system
 *
 * Auth: JWT cookie (admin_token)
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getActivities, clearActivities } from '@/lib/webhooks/activity-log';
import type { ActivityEventType } from '@/lib/webhooks/activity-log';

export const dynamic = 'force-dynamic';

// ─── Auth helper ───────────────────────────────────────────────────────────────

async function authenticate(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return false;
  const payload = await verifyAdminToken(token);
  return payload !== null;
}

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!(await authenticate(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 500);
  const type = searchParams.get('type') ?? undefined;

  try {
    const events = getActivities(limit, type as ActivityEventType | undefined);
    return Response.json({ events, total: events.length });
  } catch (err) {
    console.error('[api/admin/activity GET]', err);
    return Response.json({ error: 'Failed to fetch activity events' }, { status: 500 });
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  if (!(await authenticate(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    clearActivities();
    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/admin/activity DELETE]', err);
    return Response.json({ error: 'Failed to clear activity log' }, { status: 500 });
  }
}
