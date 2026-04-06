/**
 * Admin Memory API
 * GET    /api/admin/memory — list all conversations (without messages)
 * DELETE /api/admin/memory — delete all conversations
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { listConversations, deleteAllConversations } from '@/lib/ai/memory';

export const dynamic = 'force-dynamic';

// ─── Auth helper ──────────────────────────────────────────────────────────────────

async function requireAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return false;
  return (await verifyAdminToken(token)) !== null;
}

// ─── GET — list conversations ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const conversations = listConversations();
    return Response.json({ conversations, total: conversations.length });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── DELETE — clear all conversations ───────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    deleteAllConversations();
    return Response.json({ success: true, message: 'All conversations deleted' });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
