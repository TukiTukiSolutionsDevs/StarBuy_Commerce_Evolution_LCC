/**
 * Next.js Middleware — Admin Route Protection
 *
 * Protects all /admin/* routes (except /admin/login and /api/admin/auth)
 * by validating the admin_token JWT cookie using jose (Edge Runtime compatible).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, ADMIN_TOKEN_COOKIE } from '@/lib/admin-auth';

export async function middleware(request: NextRequest) {
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

  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyAdminToken(token);

  if (!payload) {
    // Token invalid or expired — redirect to login
    const loginUrl = new URL('/admin/login', request.url);
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
