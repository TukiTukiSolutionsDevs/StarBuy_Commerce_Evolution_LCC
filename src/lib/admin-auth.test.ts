/**
 * Unit tests — admin-auth.ts (JWT operations)
 *
 * We test with REAL jose — no mocking of crypto primitives.
 * Only env vars are controlled via vi.stubEnv().
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SignJWT } from 'jose';
import { signAdminToken, verifyAdminToken, ADMIN_TOKEN_COOKIE } from './admin-auth';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TEST_SECRET = 'test-secret-that-is-long-enough-for-hs256';

/** Sign a raw token bypassing signAdminToken, to test edge cases */
async function signRawToken(
  payload: Record<string, unknown>,
  secret: string,
  opts?: { issuer?: string; expiresIn?: string },
) {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);

  let builder = new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt();

  if (opts?.issuer !== undefined) {
    builder = builder.setIssuer(opts.issuer);
  } else {
    builder = builder.setIssuer('starbuy-admin');
  }

  if (opts?.expiresIn) {
    builder = builder.setExpirationTime(opts.expiresIn);
  } else {
    builder = builder.setExpirationTime('24h');
  }

  return builder.sign(key);
}

// ─── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv('ADMIN_JWT_SECRET', TEST_SECRET);
});

// ─── ADMIN_TOKEN_COOKIE constant ───────────────────────────────────────────────

describe('ADMIN_TOKEN_COOKIE', () => {
  it('is a non-empty string', () => {
    expect(typeof ADMIN_TOKEN_COOKIE).toBe('string');
    expect(ADMIN_TOKEN_COOKIE.length).toBeGreaterThan(0);
  });
});

// ─── getSecret ─────────────────────────────────────────────────────────────────

describe('getSecret (tested via sign/verify)', () => {
  it('throws when neither ADMIN_JWT_SECRET nor ADMIN_CHAT_PASSWORD is set', async () => {
    vi.unstubAllEnvs();
    // Ensure both are undefined
    vi.stubEnv('ADMIN_JWT_SECRET', '');
    vi.stubEnv('ADMIN_CHAT_PASSWORD', '');

    // getSecret is private, but we can trigger it via signAdminToken
    await expect(signAdminToken('admin')).rejects.toThrow(
      '[admin-auth] Neither ADMIN_JWT_SECRET nor ADMIN_CHAT_PASSWORD is set',
    );
  });

  it('uses ADMIN_CHAT_PASSWORD as fallback when ADMIN_JWT_SECRET is absent', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('ADMIN_CHAT_PASSWORD', TEST_SECRET);

    // Should NOT throw — fallback is present
    const token = await signAdminToken('admin');
    expect(typeof token).toBe('string');
  });
});

// ─── signAdminToken ────────────────────────────────────────────────────────────

describe('signAdminToken', () => {
  it('returns a string (JWT format)', async () => {
    const token = await signAdminToken('admin');
    // JWTs have 3 base64url segments separated by dots
    expect(token.split('.').length).toBe(3);
  });

  it('embeds the correct role: admin', async () => {
    const token = await signAdminToken('admin');
    const payload = await verifyAdminToken(token);
    expect(payload?.role).toBe('admin');
  });

  it('embeds the correct role: viewer', async () => {
    const token = await signAdminToken('viewer');
    const payload = await verifyAdminToken(token);
    expect(payload?.role).toBe('viewer');
  });

  it('sets iat (issued at) in the token', async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await signAdminToken('admin');
    const payload = await verifyAdminToken(token);
    expect(payload?.iat).toBeGreaterThanOrEqual(before);
  });

  it('sets exp (expiry) 24h in the future', async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await signAdminToken('admin');
    const payload = await verifyAdminToken(token);
    // exp should be ~86400 seconds from now (allow 5s tolerance)
    const expectedExp = before + 86400;
    expect(payload?.exp).toBeGreaterThanOrEqual(expectedExp - 5);
    expect(payload?.exp).toBeLessThanOrEqual(expectedExp + 5);
  });
});

// ─── verifyAdminToken ──────────────────────────────────────────────────────────

describe('verifyAdminToken', () => {
  it('returns the payload for a valid token', async () => {
    const token = await signAdminToken('admin');
    const payload = await verifyAdminToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.role).toBe('admin');
    expect(typeof payload?.iat).toBe('number');
    expect(typeof payload?.exp).toBe('number');
  });

  it('returns null for a completely invalid token string', async () => {
    const result = await verifyAdminToken('not.a.jwt');
    expect(result).toBeNull();
  });

  it('returns null for a token signed with a different secret', async () => {
    const wrongToken = await signRawToken({ role: 'admin' }, 'totally-different-secret');
    const result = await verifyAdminToken(wrongToken);
    expect(result).toBeNull();
  });

  it('returns null for an expired token', async () => {
    // Sign a token that expired 1 second ago
    const expiredToken = await signRawToken({ role: 'admin' }, TEST_SECRET, { expiresIn: '1s' });

    // Wait 1.5s so the token is definitely expired
    await new Promise((r) => setTimeout(r, 1500));

    const result = await verifyAdminToken(expiredToken);
    expect(result).toBeNull();
  }, 10000);

  it('returns null for a token with the wrong issuer', async () => {
    const wrongIssuerToken = await signRawToken({ role: 'admin' }, TEST_SECRET, {
      issuer: 'wrong-issuer',
    });
    const result = await verifyAdminToken(wrongIssuerToken);
    expect(result).toBeNull();
  });

  it('returns null for an empty string', async () => {
    const result = await verifyAdminToken('');
    expect(result).toBeNull();
  });
});
