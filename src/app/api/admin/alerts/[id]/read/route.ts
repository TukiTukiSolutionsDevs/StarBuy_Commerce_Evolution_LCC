/**
 * POST /api/admin/alerts/[id]/read — mark alert as read
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { markAlertRead } from '@/lib/alerts/store';

export const dynamic = 'force-dynamic';

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const alert = markAlertRead(id);
    return Response.json({ alert });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('not found'))
      return Response.json({ error: 'Alert not found' }, { status: 404 });
    console.error('[api/admin/alerts/[id]/read POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
