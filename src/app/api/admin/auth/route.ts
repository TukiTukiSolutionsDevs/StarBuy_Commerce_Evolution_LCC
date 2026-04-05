/**
 * Admin Auth API — Login endpoint
 *
 * POST /api/admin/auth
 * Validates the admin password and sets a httpOnly session cookie.
 */

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

// Simple token value — for this lightweight admin tool we use a signed
// deterministic value derived from the password rather than a JWT library.
function makeToken(password: string): string {
  // Base64-encode a prefixed value; not cryptographically strong but sufficient
  // for an internal admin tool behind HTTPS. For production, use jose/JWT.
  const payload = `starbuy-admin:${password}:${process.env.NODE_ENV}`;
  return Buffer.from(payload).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { password?: string };
    const { password } = body;

    if (!password) {
      return Response.json(
        { success: false, error: 'Password is required.' },
        { status: 400 }
      );
    }

    const expectedPassword = process.env.ADMIN_CHAT_PASSWORD;

    if (!expectedPassword) {
      console.error('[admin/auth] ADMIN_CHAT_PASSWORD env var not set');
      return Response.json(
        { success: false, error: 'Admin auth not configured.' },
        { status: 500 }
      );
    }

    if (password !== expectedPassword) {
      return Response.json(
        { success: false, error: 'Incorrect password.' },
        { status: 401 }
      );
    }

    const token = makeToken(password);
    const cookieStore = await cookies();

    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // 7-day session
      maxAge: 7 * 24 * 60 * 60,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/admin/auth] error:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete('admin_token');
  return Response.json({ success: true });
}
