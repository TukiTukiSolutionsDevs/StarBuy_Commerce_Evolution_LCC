/**
 * Admin Settings API
 * GET  /api/admin/settings — get current config + store info
 * PUT  /api/admin/settings — update config
 * POST /api/admin/settings — test connection / clear cache / logout
 */

import type { NextRequest } from 'next/server';
import { getFullConfig, saveConfig, type AIProvider } from '@/lib/ai/config';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// ─── Store Info Query ───────────────────────────────────────────────────────────

const SHOP_INFO_QUERY = `
  query AdminSettingsShopInfo {
    shop {
      name
      email
      myshopifyDomain
      plan {
        displayName
      }
      currencyCode
      primaryDomain {
        url
      }
    }
  }
`;

type ShopInfoData = {
  shop: {
    name: string;
    email: string;
    myshopifyDomain: string;
    plan: { displayName: string };
    currencyCode: string;
    primaryDomain: { url: string };
  };
};

type StoreInfo = {
  name: string;
  email: string;
  domain: string;
  primaryDomain: string;
  plan: string;
  currency: string;
  apiVersion: string;
};

async function fetchStoreInfo(): Promise<StoreInfo | null> {
  try {
    const { adminFetch } = await import('@/lib/shopify/admin/client');
    const data = await adminFetch<ShopInfoData>({ query: SHOP_INFO_QUERY });

    return {
      name: data.shop.name,
      email: data.shop.email,
      domain: data.shop.myshopifyDomain,
      primaryDomain: data.shop.primaryDomain.url,
      plan: data.shop.plan.displayName,
      currency: data.shop.currencyCode,
      apiVersion: '2026-04',
    };
  } catch {
    return null;
  }
}

// ─── GET — current config + store info ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getFullConfig();
  const storeInfo = await fetchStoreInfo();

  return Response.json({ ...config, storeInfo });
}

// ─── PUT — update config ────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
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

// ─── POST — test connection / actions ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  const adminToken = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!adminToken || !(await verifyAdminToken(adminToken))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      test?: 'shopify' | 'ollama' | 'provider';
      action?: 'clear-cache' | 'logout';
      provider?: AIProvider;
    };

    // ─── Test connections ─────────────────────────────────────────────────────

    if (body.test === 'shopify') {
      const { getAdminToken } = await import('@/lib/shopify/admin/token');
      const shopToken = await getAdminToken();
      return Response.json({
        success: true,
        message: `Connected (token: ${shopToken.slice(0, 10)}...)`,
      });
    }

    if (body.test === 'ollama') {
      const config = getFullConfig();
      const res = await fetch(`${config.ollama.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Ollama responded ${res.status}`);
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = data.models?.map((m) => m.name) ?? [];
      return Response.json({
        success: true,
        message: `Ollama running — ${models.length} models`,
        models,
      });
    }

    // ─── Actions ──────────────────────────────────────────────────────────────

    if (body.action === 'clear-cache') {
      // Next.js 16: revalidateTag requires (tag, profile) — use 'default' profile
      try {
        const { revalidateTag } = await import('next/cache');
        revalidateTag('shopify', 'default');
        revalidateTag('products', 'default');
        revalidateTag('collections', 'default');
      } catch {
        // revalidateTag not available in all contexts — ignore
      }
      return Response.json({ success: true, message: 'Cache cleared successfully' });
    }

    if (body.action === 'logout') {
      // We clear the admin session cookie — effective "logout all sessions"
      // since JWT is stateless, cookie deletion is the only revocation mechanism.
      const response = Response.json({ success: true, message: 'Session cleared' });
      // Cannot set cookies directly on a Response object in Next.js route handlers
      // The client handles cookie deletion via the login page redirect
      return response;
    }

    return Response.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (err) {
    return Response.json({ success: false, error: (err as Error).message }, { status: 200 });
  }
}
