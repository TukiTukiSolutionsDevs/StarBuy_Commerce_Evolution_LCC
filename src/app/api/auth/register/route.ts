import { cookies } from 'next/headers';
import { createCustomer, loginCustomer } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    };

    const { email, password, firstName = '', lastName = '' } = body;

    if (!email || !password) {
      return Response.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // 1. Create customer account
    const { success, errors } = await createCustomer(email, password, firstName, lastName);

    if (!success || errors.length > 0) {
      const message = errors[0]?.message ?? 'Could not create account.';
      return Response.json({ success: false, error: message }, { status: 422 });
    }

    // 2. Auto-login after registration
    const { accessToken, expiresAt, errors: loginErrors } = await loginCustomer(email, password);

    if (loginErrors.length > 0 || !accessToken) {
      // Account created but login failed — still a success, redirect to login
      return Response.json({ success: true, autoLogin: false });
    }

    // 3. Set cookie
    const cookieStore = await cookies();
    const expires = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    cookieStore.set('shopify_customer_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires,
    });

    return Response.json({ success: true, autoLogin: true });
  } catch (err) {
    console.error('[api/auth/register] error:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
