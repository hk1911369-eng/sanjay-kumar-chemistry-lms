import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile, error } = await supabase.from('profiles').select('is_active').eq('id', user.id).maybeSingle();
    if (error) {
      const unavailable = NextResponse.json(
        { error: 'Unable to verify account status. Please try again.' },
        { status: 503 },
      );
      response.cookies.getAll().forEach(cookie => unavailable.cookies.set(cookie));
      return unavailable;
    }
    if (profile?.is_active !== true) {
      const destination = request.nextUrl.clone();
      destination.pathname = '/account-disabled';
      destination.search = '';
      const redirect = NextResponse.redirect(destination);
      response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
      return redirect;
    }
  }
  return response;
}
