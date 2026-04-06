/**
 * Admin Automations — Single Rule
 *
 * GET    /api/admin/automations/[id] — get rule
 * PATCH  /api/admin/automations/[id] — update rule (toggle enabled, edit fields)
 * DELETE /api/admin/automations/[id] — delete rule
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { getRule, saveRule, deleteRule, toggleRule } from '@/lib/automations/store';
import type { AutomationRule } from '@/lib/automations/types';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const rule = getRule(id);

    if (!rule) {
      return Response.json({ error: 'Rule not found' }, { status: 404 });
    }

    return Response.json({ rule });
  } catch (err) {
    console.error('[api/admin/automations/[id] GET]', err);
    return Response.json({ error: 'Failed to fetch automation rule' }, { status: 500 });
  }
}

// ─── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const existing = getRule(id);

    if (!existing) {
      return Response.json({ error: 'Rule not found' }, { status: 404 });
    }

    const body = (await request.json()) as Partial<AutomationRule>;

    // Fast-path: toggle only
    if (Object.keys(body).length === 1 && 'enabled' in body) {
      toggleRule(id, body.enabled!);
      const updated = getRule(id);
      return Response.json({ rule: updated });
    }

    // Full or partial update — merge into existing
    const updated: AutomationRule = {
      ...existing,
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      ...(body.trigger !== undefined && { trigger: body.trigger }),
      ...(body.conditions !== undefined && { conditions: body.conditions }),
      ...(body.actions !== undefined && { actions: body.actions }),
    };

    saveRule(updated);
    return Response.json({ rule: updated });
  } catch (err) {
    console.error('[api/admin/automations/[id] PATCH]', err);
    return Response.json({ error: 'Failed to update automation rule' }, { status: 500 });
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const existing = getRule(id);

    if (!existing) {
      return Response.json({ error: 'Rule not found' }, { status: 404 });
    }

    deleteRule(id);
    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/admin/automations/[id] DELETE]', err);
    return Response.json({ error: 'Failed to delete automation rule' }, { status: 500 });
  }
}
