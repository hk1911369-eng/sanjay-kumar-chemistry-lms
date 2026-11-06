import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const token_hash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  const next = request.nextUrl.searchParams.get('next');
  // Resolve redirects against this request and accept only same-origin destinations.
  // Checking only for a leading slash is insufficient because backslashes can
  // be normalized into an external URL by the URL parser.
  let destination = '/portal';
  if (next) {
    try {
      const target = new URL(next, request.url);
      if (target.origin === request.nextUrl.origin) {
        destination = `${target.pathname}${target.search}${target.hash}`;
      }
    } catch {
      // Keep the safe default destination for malformed values.
    }
  }
  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, request.url));
  }
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as 'signup' | 'email' | 'recovery' });
    if (!error) return NextResponse.redirect(new URL(type === 'recovery' ? '/reset-password' : destination, request.url));
  }
  return NextResponse.redirect(new URL('/login?error=Email%20confirmation%20failed.%20Request%20a%20new%20link.', request.url));
}
