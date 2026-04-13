/**
 * GET  /api/admin/states/pulse — Pulse events feed
 * PATCH /api/admin/states/pulse — Mark events as read
 *
 * Query params (GET):
 *   severity — filter by severity level
 *   state    — filter by state code
 *   unread   — 'true' to show only unread
 *   limit    — max events (default 50, max 200)
 *
 * Auth: JWT cookie required.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { loadPulseEvents, markPulseEventsRead, getUnreadPulseCount } from '@/lib/states/store';
import type { PulseSeverity } from '@/lib/states/types';

export const dynamic = 'force-dynamic';

const VALID_SEVERITIES: PulseSeverity[] = ['minor', 'notable', 'major', 'anomaly'];

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
    const severity = url.searchParams.get('severity');
    const state = url.searchParams.get('state');
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);

    if (severity && !VALID_SEVERITIES.includes(severity as PulseSeverity)) {
      return Response.json(
        { error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}` },
        { status: 400 },
      );
    }

    let events = loadPulseEvents();

    if (severity) events = events.filter((e) => e.severity === severity);
    if (state) events = events.filter((e) => e.stateCode === state.toUpperCase());
    if (unreadOnly) events = events.filter((e) => !e.isRead);

    const total = events.length;
    events = events.slice(0, limit);

    return Response.json({
      events,
      unreadCount: getUnreadPulseCount(),
      total,
    });
  } catch (err) {
    console.error('[api/admin/states/pulse GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    let body: { eventIds?: string[] };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!Array.isArray(body.eventIds) || body.eventIds.length === 0) {
      return Response.json(
        { error: 'eventIds must be a non-empty array of strings' },
        { status: 400 },
      );
    }

    const marked = markPulseEventsRead(body.eventIds);
    return Response.json({ marked });
  } catch (err) {
    console.error('[api/admin/states/pulse PATCH]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
