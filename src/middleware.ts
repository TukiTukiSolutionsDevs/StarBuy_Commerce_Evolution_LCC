/**
 * Next.js Middleware — Admin Route Protection
 *
 * Protects all /admin/* routes (except /api/admin/auth) by validating
 * the admin_token cookie.
 */

import { type NextRequest, NextResponse } from 'next/server';

function makeExpectedToken(password: string, nodeEnv: string): string {
  const payload = `starbuy-admin:${password}:${nodeEnv}`;
  return Buffer.from(payload).toString('base64');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Allow the auth API endpoint to pass through (login/logout)
  if (pathname.startsWith('/api/admin/auth')) {
    return NextResponse.next();
  }

  // Allow the login page itself through (prevent redirect loop)
  if (pathname === '/admin/login' || pathname === '/admin/login/') {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_CHAT_PASSWORD;
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  // If no password configured, block everything
  if (!adminPassword) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const token = request.cookies.get('admin_token')?.value;
  const expectedToken = makeExpectedToken(adminPassword, nodeEnv);

  if (!token || token !== expectedToken) {
    const loginUrl = new URL('/admin/login', request.url);
    // Preserve the intended destination so we can redirect after login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all /admin/* routes but exclude:
     * - Static files (_next/static)
     * - Images (_next/image)
     * - Favicon
     */
    '/admin/:path*',
  ],
};
