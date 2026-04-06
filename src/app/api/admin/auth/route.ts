/**
 * Admin Auth API — Login / Logout
 *
 * POST   /api/admin/auth  → validates password, sets JWT cookie
 * DELETE /api/admin/auth  → clears the cookie (logout)
 */

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { signAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { password?: string };
    const { password } = body;

    if (!password) {
      return Response.json({ success: false, error: 'Password is required.' }, { status: 400 });
    }

    const expectedPassword = process.env.ADMIN_CHAT_PASSWORD;

    if (!expectedPassword) {
      console.error('[admin/auth] ADMIN_CHAT_PASSWORD env var not set');
      return Response.json(
        { success: false, error: 'Admin auth not configured.' },
        { status: 500 },
      );
    }

    if (password !== expectedPassword) {
      return Response.json({ success: false, error: 'Incorrect password.' }, { status: 401 });
    }

    // Sign a proper JWT — valid for 24 hours
    const token = await signAdminToken('admin');
    const cookieStore = await cookies();

    cookieStore.set(ADMIN_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400, // 24 hours
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/admin/auth] error:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_TOKEN_COOKIE);
  return Response.json({ success: true });
}
