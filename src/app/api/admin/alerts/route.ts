/**
 * GET  /api/admin/alerts — list alerts (filtered)
 * POST /api/admin/alerts — create alert
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getAlertsByFilter, addAlert } from '@/lib/alerts/store';
import type { AlertStatus, AlertType, AlertSeverity, CreateAlertInput } from '@/lib/alerts/types';

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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as AlertStatus | null;
    const type = searchParams.get('type') as AlertType | null;
    const severity = searchParams.get('severity') as AlertSeverity | null;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const alerts = getAlertsByFilter({
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(severity ? { severity } : {}),
      limit,
    });

    // Sort newest first
    const sorted = [...alerts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return Response.json({ alerts: sorted });
  } catch (err) {
    console.error('[api/admin/alerts GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await request.json()) as Partial<CreateAlertInput>;

    if (!body.type)
      return Response.json({ error: 'Missing required field: type' }, { status: 400 });
    if (!body.title)
      return Response.json({ error: 'Missing required field: title' }, { status: 400 });
    if (!body.severity)
      return Response.json({ error: 'Missing required field: severity' }, { status: 400 });
    if (!body.message)
      return Response.json({ error: 'Missing required field: message' }, { status: 400 });

    const alert = addAlert(body as CreateAlertInput);
    return Response.json({ alert }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/alerts POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
