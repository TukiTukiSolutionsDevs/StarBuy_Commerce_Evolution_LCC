/**
 * GET    /api/admin/trends/keys — returns key statuses (masked) for all trend providers
 * POST   /api/admin/trends/keys — set a key { providerId: TrendApiKey, key: string }
 * DELETE /api/admin/trends/keys — remove a key { providerId: TrendApiKey }
 *
 * Auth: JWT cookie required on all handlers.
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { setApiKey, deleteApiKey, getProviderKeyStatus } from '@/lib/trends';
import type { TrendApiKey } from '@/lib/trends';

export const dynamic = 'force-dynamic';

const VALID_KEYS: TrendApiKey[] = [
  'serpapi',
  'amazon-access-key',
  'amazon-secret-key',
  'amazon-partner-tag',
  'meta-access-token',
];

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const payload = await authenticate(request);
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const allStatuses = getProviderKeyStatus();
  const keys = Object.fromEntries(VALID_KEYS.map((k) => [k, allStatuses[k]]));
  return Response.json({ keys });
}

// ─── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const payload = await authenticate(request);
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

  const { providerId, key } = body as { providerId?: unknown; key?: unknown };

  if (typeof providerId !== 'string' || !VALID_KEYS.includes(providerId as TrendApiKey)) {
    return Response.json(
      { error: `providerId must be one of: ${VALID_KEYS.join(', ')}` },
      { status: 400 },
    );
  }

  if (typeof key !== 'string' || !key.trim()) {
    return Response.json({ error: 'key must be a non-empty string' }, { status: 400 });
  }

  try {
    setApiKey(providerId as TrendApiKey, key.trim());
    const allStatuses = getProviderKeyStatus();
    const status = allStatuses[providerId as TrendApiKey];
    return Response.json({ success: true, status });
  } catch (err) {
    console.error('[api/admin/trends/keys POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const payload = await authenticate(request);
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

  if (typeof providerId !== 'string' || !VALID_KEYS.includes(providerId as TrendApiKey)) {
    return Response.json(
      { error: `providerId must be one of: ${VALID_KEYS.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    deleteApiKey(providerId as TrendApiKey);
    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/admin/trends/keys DELETE]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
