import { NextResponse } from 'next/server';
import { COOKIE, verifyToken } from '@/lib/session';

export async function middleware(req) {
  const ok = await verifyToken(req.cookies.get(COOKIE)?.value);
  if (ok) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/bookings/:path*', '/customers/:path*', '/calendar/:path*', '/api/admin/:path*'],
};
