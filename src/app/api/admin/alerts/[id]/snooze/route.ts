/**
 * POST /api/admin/alerts/[id]/snooze — snooze alert
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { snoozeAlert } from '@/lib/alerts/store';
import type { SnoozeDuration } from '@/lib/alerts/types';

export const dynamic = 'force-dynamic';

const VALID_HOURS: SnoozeDuration[] = [1, 24, 168];

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await request.json()) as { hours?: unknown };
    const hours = body.hours as SnoozeDuration;

    if (!hours || !VALID_HOURS.includes(hours)) {
      return Response.json(
        { error: `Invalid hours. Must be one of: ${VALID_HOURS.join(', ')}` },
        { status: 400 },
      );
    }

    const { id } = await params;
    const alert = snoozeAlert(id, hours);
    return Response.json({ alert });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('not found'))
      return Response.json({ error: 'Alert not found' }, { status: 404 });
    console.error('[api/admin/alerts/[id]/snooze POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
