import { cookies } from 'next/headers';
import { deleteCustomerToken } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('shopify_customer_token');

    // Invalidate token on Shopify side if we have it
    if (tokenCookie?.value) {
      await deleteCustomerToken(tokenCookie.value);
    }

    // Clear the cookie
    cookieStore.set('shopify_customer_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/auth/logout] error:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
