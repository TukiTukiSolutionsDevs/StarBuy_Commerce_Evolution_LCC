/**
 * GET /api/admin/alerts/preferences — get preferences
 * PUT /api/admin/alerts/preferences — update preferences
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { loadPreferences, savePreferences, mergeWithDefaults } from '@/lib/alerts/preferences';
import type { AlertPreferences } from '@/lib/alerts/types';

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
    const preferences = loadPreferences();
    return Response.json({ preferences });
  } catch (err) {
    console.error('[api/admin/alerts/preferences GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await request.json()) as Partial<AlertPreferences>;
    const preferences = mergeWithDefaults(body);
    savePreferences(preferences);
    return Response.json({ preferences });
  } catch (err) {
    console.error('[api/admin/alerts/preferences PUT]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
