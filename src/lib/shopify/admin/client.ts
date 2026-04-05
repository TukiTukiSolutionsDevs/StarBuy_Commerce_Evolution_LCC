/**
 * Shopify Admin GraphQL Client
 *
 * Uses the OAuth token manager to authenticate requests.
 * Targets Admin API version 2026-01.
 */

import { getAdminToken } from './token';

// ─── Types ─────────────────────────────────────────────────────────────────────

type AdminFetchOptions = {
  query: string;
  variables?: Record<string, unknown>;
};

type ShopifyAdminError = {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
  extensions?: {
    code?: string;
    documentation?: string;
    requestId?: string;
  };
};

type ShopifyAdminResponse<T> = {
  data?: T;
  errors?: ShopifyAdminError[];
  extensions?: {
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
};

// ─── Client ────────────────────────────────────────────────────────────────────

const API_VERSION = '2026-01';

export async function adminFetch<T>(options: AdminFetchOptions): Promise<T> {
  const { query, variables } = options;

  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) {
    throw new Error('[AdminClient] Missing SHOPIFY_STORE_DOMAIN env var');
  }

  const token = await getAdminToken();
  const endpoint = `https://${domain}/admin/api/${API_VERSION}/graphql.json`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[AdminClient] HTTP ${res.status} — ${text}`);
  }

  const json = (await res.json()) as ShopifyAdminResponse<T>;

  if (json.errors && json.errors.length > 0) {
    const messages = json.errors.map((e) => {
      const code = e.extensions?.code ? ` [${e.extensions.code}]` : '';
      return `${e.message}${code}`;
    });
    throw new Error(`[AdminClient] GraphQL errors: ${messages.join('; ')}`);
  }

  if (!json.data) {
    throw new Error('[AdminClient] Empty data in response');
  }

  return json.data;
}
