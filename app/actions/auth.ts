'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeBangladeshMobile } from '@/lib/validation';

function getAppUrl() {
  const configured = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_URL or NEXT_PUBLIC_SITE_URL must be configured for production authentication redirects.');
  }
  return 'http://localhost:3000';
}

function safeMessage(message: string) {
  if (/invalid login credentials/i.test(message)) return 'Email or password is incorrect.';
  if (/email not confirmed|email_not_confirmed/i.test(message)) return 'Please confirm your email address before signing in. Open the latest confirmation email.';
  if (/rate limit|email rate limit exceeded/i.test(message)) return 'Supabase email limit reached. Wait before requesting another email.';
  if (/already registered/i.test(message)) return 'An account with this email already exists. Sign in or reset its password.';
  if (/password.*(length|short)|at least 8 characters/i.test(message)) return 'Password must be at least 8 characters.';
  return 'Authentication failed. Please check your details and try again.';
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || password.length < 8) redirect('/login?error=invalid');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(\`/login?error=\${encodeURIComponent(safeMessage(error.message))}\`);
  redirect('/portal');
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const rawPhone = String(formData.get('phone') ?? '').trim();
  const phone = rawPhone ? normalizeBangladeshMobile(rawPhone) : null;
  const password = String(formData.get('password') ?? '');
  if (fullName.length < 2 || !email || password.length < 8 || (rawPhone && !phone)) redirect('/register?error=invalid');
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email, password,
    options: {
      emailRedirectTo: \`\${getAppUrl()}/auth/confirm\`,
      data: { full_name: fullName, phone },
    },
  });
  if (error) redirect(\`/register?error=\${encodeURIComponent(safeMessage(error.message))}\`);
  redirect('/register?message=Check your email for the confirmation link.');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) redirect('/forgot-password?error=invalid');
  const supabase = await createClient();
  const redirectTo = \`\${getAppUrl()}/auth/confirm?next=/reset-password\`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) redirect('/forgot-password?error=failed');
  redirect('/forgot-password?sent=1');
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) redirect('/reset-password?error=invalid');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?error=reset_session');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect('/reset-password?error=failed');
  redirect('/portal?password_updated=1');
}
