import { cookies } from 'next/headers';
import { loginCustomer } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const { accessToken, expiresAt, errors } = await loginCustomer(email, password);

    if (errors.length > 0 || !accessToken) {
      const message = errors[0]?.message ?? 'Invalid email or password.';
      return Response.json({ success: false, error: message }, { status: 401 });
    }

    // Set httpOnly cookie
    const cookieStore = await cookies();
    const expires = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    cookieStore.set('shopify_customer_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/auth/login] error:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
