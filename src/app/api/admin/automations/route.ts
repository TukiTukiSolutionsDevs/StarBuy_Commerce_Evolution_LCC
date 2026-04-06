/**
 * Admin Automations API
 *
 * GET  /api/admin/automations — list all rules (seeds prebuilt if empty)
 * POST /api/admin/automations — create a new rule
 */

import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { listRules, saveRule } from '@/lib/automations/store';
import { getPrebuiltRules } from '@/lib/automations/prebuilt';
import type { AutomationRule } from '@/lib/automations/types';

export const dynamic = 'force-dynamic';

// ─── GET — list rules ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let rules = listRules();

    // Seed prebuilt rules if store is empty
    if (rules.length === 0) {
      const prebuilt = getPrebuiltRules();
      for (const rule of prebuilt) {
        saveRule(rule);
      }
      rules = listRules();
    }

    return Response.json({ rules });
  } catch (err) {
    console.error('[api/admin/automations GET]', err);
    return Response.json({ error: 'Failed to fetch automation rules' }, { status: 500 });
  }
}

// ─── POST — create rule ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<AutomationRule>;

    if (!body.name) {
      return Response.json({ error: 'name is required' }, { status: 400 });
    }
    if (!body.trigger) {
      return Response.json({ error: 'trigger is required' }, { status: 400 });
    }
    if (!body.actions || body.actions.length === 0) {
      return Response.json({ error: 'At least one action is required' }, { status: 400 });
    }

    const rule: AutomationRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: body.name,
      description: body.description ?? '',
      enabled: body.enabled ?? true,
      trigger: body.trigger,
      conditions: body.conditions ?? [],
      actions: body.actions,
      lastRunAt: null,
      runCount: 0,
      createdAt: Date.now(),
    };

    saveRule(rule);
    return Response.json({ rule }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/automations POST]', err);
    return Response.json({ error: 'Failed to create automation rule' }, { status: 500 });
  }
}
