/**
 * GET /api/admin/alerts/unread-count
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getUnreadCount } from '@/lib/alerts/store';

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
    const count = getUnreadCount();
    return Response.json({ count });
  } catch (err) {
    console.error('[api/admin/alerts/unread-count GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
