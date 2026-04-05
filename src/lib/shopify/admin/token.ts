/**
 * Shopify Admin API — OAuth Token Manager
 *
 * Exchanges client credentials for an access token (client_credentials grant).
 * Singleton — prevents concurrent fetches and auto-refreshes 5 min before expiry.
 */

type TokenResponse = {
  access_token: string;
  expires_in: number; // seconds
  token_type: string;
};

type TokenState = {
  accessToken: string;
  expiresAt: number; // Unix ms
};

// ─── Singleton state ───────────────────────────────────────────────────────────

let tokenState: TokenState | null = null;
let pendingFetch: Promise<TokenState> | null = null;

// 5-minute safety margin before true expiry
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

// ─── Internal helpers ──────────────────────────────────────────────────────────

function isExpired(state: TokenState): boolean {
  return Date.now() >= state.expiresAt - REFRESH_MARGIN_MS;
}

async function fetchNewToken(): Promise<TokenState> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    throw new Error(
      '[AdminToken] Missing required env vars: SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET'
    );
  }

  const url = `https://${domain}/admin/oauth/access_token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    // No Next.js cache — token management is handled manually
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[AdminToken] Token fetch failed: ${res.status} — ${text}`);
  }

  const data = (await res.json()) as TokenResponse;

  if (!data.access_token) {
    throw new Error('[AdminToken] No access_token in response');
  }

  return {
    accessToken: data.access_token,
    // Shopify returns expires_in in seconds; convert to absolute ms timestamp
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns a valid Admin API access token.
 * Thread-safe: concurrent calls share a single in-flight fetch promise.
 */
export async function getAdminToken(): Promise<string> {
  // Fast path — token is still valid
  if (tokenState && !isExpired(tokenState)) {
    return tokenState.accessToken;
  }

  // Prevent concurrent fetches (mutex via shared promise)
  if (pendingFetch) {
    const state = await pendingFetch;
    return state.accessToken;
  }

  pendingFetch = fetchNewToken().then((state) => {
    tokenState = state;
    pendingFetch = null;
    return state;
  }).catch((err: unknown) => {
    pendingFetch = null;
    throw err;
  });

  const state = await pendingFetch;
  return state.accessToken;
}
