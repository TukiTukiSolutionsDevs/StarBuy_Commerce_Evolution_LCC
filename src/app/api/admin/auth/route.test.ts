/**
 * Integration tests — POST /api/admin/auth & DELETE /api/admin/auth
 *
 * We mock `next/headers` (cookies) and control env vars.
 * We use the REAL signAdminToken (no mock on jose).
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoist mock vars so they're available in vi.mock factory ─────────────────

const { mockCookieSet, mockCookieDelete } = vi.hoisted(() => ({
  mockCookieSet: vi.fn(),
  mockCookieDelete: vi.fn(),
}));

// ─── Mock next/headers ────────────────────────────────────────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    set: mockCookieSet,
    delete: mockCookieDelete,
  }),
}));

// ─── Import AFTER mocking ─────────────────────────────────────────────────────

import { POST, DELETE } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CORRECT_PASSWORD = 'super-secret-password-123';

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost/api/admin/auth', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeDeleteRequest(): Request {
  return new Request('http://localhost/api/admin/auth', {
    method: 'DELETE',
  });
}

// ─── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('ADMIN_CHAT_PASSWORD', CORRECT_PASSWORD);
  vi.stubEnv('ADMIN_JWT_SECRET', 'test-jwt-secret-that-is-long-enough');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── POST — success ───────────────────────────────────────────────────────────

describe('POST /api/admin/auth', () => {
  it('returns 200 when the correct password is provided', async () => {
    const req = makePostRequest({ password: CORRECT_PASSWORD });
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(200);
  });

  it('returns { success: true } on successful login', async () => {
    const req = makePostRequest({ password: CORRECT_PASSWORD });
    const res = await POST(req as Parameters<typeof POST>[0]);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('calls cookieStore.set with the token cookie on success', async () => {
    const req = makePostRequest({ password: CORRECT_PASSWORD });
    await POST(req as Parameters<typeof POST>[0]);

    expect(mockCookieSet).toHaveBeenCalledTimes(1);

    const [cookieName, cookieValue, cookieOptions] = mockCookieSet.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];

    expect(cookieName).toBe('admin_token');
    // Value should be a JWT (3 base64url segments separated by dots)
    expect(cookieValue.split('.').length).toBe(3);
    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.path).toBe('/');
  });

  // ─── Wrong password ───────────────────────────────────────────────────────

  it('returns 401 when the password is wrong', async () => {
    const req = makePostRequest({ password: 'wrong-password' });
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(401);
  });

  it('returns { success: false } with error message on wrong password', async () => {
    const req = makePostRequest({ password: 'wrong-password' });
    const res = await POST(req as Parameters<typeof POST>[0]);
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });

  it('does NOT set a cookie when the password is wrong', async () => {
    const req = makePostRequest({ password: 'wrong-password' });
    await POST(req as Parameters<typeof POST>[0]);
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  // ─── Missing password ─────────────────────────────────────────────────────

  it('returns 400 when no password is provided', async () => {
    const req = makePostRequest({});
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is explicitly null', async () => {
    const req = makePostRequest({ password: null });
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
  });

  it('returns { success: false } when password is missing', async () => {
    const req = makePostRequest({});
    const res = await POST(req as Parameters<typeof POST>[0]);
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });

  // ─── Env var not configured ───────────────────────────────────────────────

  it('returns 500 when ADMIN_CHAT_PASSWORD env var is not set', async () => {
    vi.stubEnv('ADMIN_CHAT_PASSWORD', '');
    const req = makePostRequest({ password: 'any' });
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(500);
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

describe('DELETE /api/admin/auth', () => {
  it('returns 200', async () => {
    const req = makeDeleteRequest();
    const res = await DELETE(req as Parameters<typeof DELETE>[0]);
    expect(res.status).toBe(200);
  });

  it('returns { success: true }', async () => {
    const req = makeDeleteRequest();
    const res = await DELETE(req as Parameters<typeof DELETE>[0]);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('calls cookieStore.delete with the correct cookie name', async () => {
    const req = makeDeleteRequest();
    await DELETE(req as Parameters<typeof DELETE>[0]);

    expect(mockCookieDelete).toHaveBeenCalledWith('admin_token');
  });
});
