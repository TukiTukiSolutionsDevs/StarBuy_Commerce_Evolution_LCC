/**
 * Admin Settings API
 * GET  /api/admin/settings — get current config
 * PUT  /api/admin/settings — update config
 * POST /api/admin/settings/test — test provider connection
 */

import type { NextRequest } from 'next/server';
import { getFullConfig, saveConfig, type AIProvider } from '@/lib/ai/config';

export const dynamic = 'force-dynamic';

function isAdmin(request: NextRequest): boolean {
  const password = process.env.ADMIN_CHAT_PASSWORD;
  if (!password) return false;
  const token = request.cookies.get('admin_token')?.value;
  if (!token) return false;
  return token === Buffer.from(`starbuy-admin:${password}:${process.env.NODE_ENV}`).toString('base64');
}

// GET — current config
export async function GET(request: NextRequest) {
  if (!isAdmin(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const config = getFullConfig();
  return Response.json(config);
}

// PUT — update config
export async function PUT(request: NextRequest) {
  if (!isAdmin(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as {
      provider?: AIProvider;
      model?: string;
      ollamaBaseUrl?: string;
      ollamaModel?: string;
    };

    const updated = saveConfig(body);
    return Response.json({ success: true, config: updated });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}

// POST — test connection
export async function POST(request: NextRequest) {
  if (!isAdmin(request))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as { test: 'shopify' | 'ollama' | 'provider'; provider?: AIProvider };

    if (body.test === 'shopify') {
      const { getAdminToken } = await import('@/lib/shopify/admin/token');
      const token = await getAdminToken();
      return Response.json({ success: true, message: `Connected (token: ${token.slice(0, 10)}...)` });
    }

    if (body.test === 'ollama') {
      const config = getFullConfig();
      const res = await fetch(`${config.ollama.baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`Ollama responded ${res.status}`);
      const data = await res.json() as { models?: Array<{ name: string }> };
      const models = data.models?.map((m) => m.name) ?? [];
      return Response.json({ success: true, message: `Ollama running — ${models.length} models`, models });
    }

    return Response.json({ error: 'Unknown test type' }, { status: 400 });
  } catch (err) {
    return Response.json({ success: false, error: (err as Error).message }, { status: 200 });
  }
}
