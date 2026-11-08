import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

const protectedPrefixes = ['/student', '/teacher', '/admin', '/learn', '/portal', '/academic', '/students', '/apply'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requiresSession = protectedPrefixes.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
  const response = requiresSession ? await updateSession(request) : NextResponse.next({ request });
  const legacyLocale = request.cookies.get('skc_locale')?.value;
  if (!request.cookies.get('jmt_locale') && (legacyLocale === 'bn' || legacyLocale === 'en')) {
    response.cookies.set('jmt_locale', legacyLocale, {
      httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
      path: '/', maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
