/**
 * GET /api/admin/alerts/[id] — get single alert
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getAlertById } from '@/lib/alerts/store';

export const dynamic = 'force-dynamic';

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const alert = getAlertById(id);
    if (!alert) return Response.json({ error: 'Alert not found' }, { status: 404 });
    return Response.json({ alert });
  } catch (err) {
    console.error('[api/admin/alerts/[id] GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
