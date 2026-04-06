/**
 * Admin Memory — Single Conversation API
 * GET    /api/admin/memory/[id] — get a single conversation with messages
 * DELETE /api/admin/memory/[id] — delete a single conversation
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getConversation, deleteConversation } from '@/lib/ai/memory';

export const dynamic = 'force-dynamic';

// ─── Next.js 16: params are a Promise ───────────────────────────────────────────

type RouteParams = { params: Promise<{ id: string }> };

// ─── Auth helper ─────────────────────────────────────────────────────────────────

async function requireAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return false;
  return (await verifyAdminToken(token)) !== null;
}

// ─── GET — single conversation ───────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const conversation = getConversation(id);

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return Response.json({ conversation });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── DELETE — single conversation ───────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const deleted = deleteConversation(id);

    if (!deleted) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return Response.json({ success: true, message: `Conversation ${id} deleted` });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
