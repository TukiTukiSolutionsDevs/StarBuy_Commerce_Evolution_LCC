/**
 * Admin Memory — Business Insights API
 * GET  /api/admin/memory/insights — list all insights
 * POST /api/admin/memory/insights — add a new insight
 */

import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';
import { listInsights, addInsight } from '@/lib/ai/memory';
import type { BusinessInsight } from '@/lib/ai/memory';

export const dynamic = 'force-dynamic';

// ─── Auth helper ─────────────────────────────────────────────────────────────────

async function requireAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return false;
  return (await verifyAdminToken(token)) !== null;
}

// ─── GET — list insights ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const insights = listInsights();
    return Response.json({ insights, total: insights.length });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── POST — add insight ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!(await requireAuth(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      type?: BusinessInsight['type'];
      content?: string;
      source?: string;
    };

    if (!body.content || !body.type || !body.source) {
      return Response.json(
        { error: 'Missing required fields: type, content, source' },
        { status: 400 },
      );
    }

    const validTypes: BusinessInsight['type'][] = [
      'observation',
      'decision',
      'preference',
      'pattern',
    ];
    if (!validTypes.includes(body.type)) {
      return Response.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      );
    }

    const insight: BusinessInsight = {
      id: randomUUID(),
      type: body.type,
      content: body.content.trim(),
      source: body.source.trim(),
      createdAt: Date.now(),
    };

    addInsight(insight);

    return Response.json({ success: true, insight }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
