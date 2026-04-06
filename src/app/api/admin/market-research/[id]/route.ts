/**
 * Market Research Session — By ID endpoint
 *
 * GET    /api/admin/market-research/:id   — get session by ID
 * DELETE /api/admin/market-research/:id   — delete session
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getSession, deleteSession } from '@/lib/market-research/store';

export const dynamic = 'force-dynamic';

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function isAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return false;
  const payload = await verifyAdminToken(token);
  return payload !== null;
}

// ─── GET — Get session by ID ──────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const session = getSession(id);
    if (!session) {
      return Response.json({ error: `Session '${id}' not found` }, { status: 404 });
    }
    return Response.json({ session });
  } catch (err) {
    console.error(`[api/admin/market-research/${id}] GET error:`, err);
    return Response.json({ error: 'Failed to retrieve session' }, { status: 500 });
  }
}

// ─── DELETE — Delete session ──────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const session = getSession(id);
    if (!session) {
      return Response.json({ error: `Session '${id}' not found` }, { status: 404 });
    }

    deleteSession(id);
    return Response.json({ success: true, deleted: id });
  } catch (err) {
    console.error(`[api/admin/market-research/${id}] DELETE error:`, err);
    return Response.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
