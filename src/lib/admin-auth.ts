/**
 * Admin Authentication — JWT-based
 *
 * Upgraded from Base64 token to proper JWT using jose (Edge-compatible).
 * Supports role-based access: admin | viewer.
 */

import { SignJWT, jwtVerify } from 'jose';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AdminRole = 'admin' | 'viewer';

export type AdminTokenPayload = {
  role: AdminRole;
  iat: number;
  exp: number;
};

// ─── Constants ─────────────────────────────────────────────────────────────────

export const ADMIN_TOKEN_COOKIE = 'admin_token';
const TOKEN_EXPIRY = '24h';

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET ?? process.env.ADMIN_CHAT_PASSWORD;
  if (!secret) {
    throw new Error('[admin-auth] Neither ADMIN_JWT_SECRET nor ADMIN_CHAT_PASSWORD is set');
  }
  return new TextEncoder().encode(secret);
}

// ─── Sign / Verify ─────────────────────────────────────────────────────────────

export async function signAdminToken(role: AdminRole): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuer('starbuy-admin')
    .sign(getSecret());
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: 'starbuy-admin',
    });
    return payload as unknown as AdminTokenPayload;
  } catch {
    return null;
  }
}
