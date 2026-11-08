'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
export async function setLanguage(formData: FormData) {
  const value = String(formData.get('locale') ?? 'bn');
  const locale: Locale = value === 'en' ? 'en' : 'bn';
  const store = await cookies();
  store.set('jmt_locale', locale, { httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  store.delete('skc_locale');
  const back = String(formData.get('return_to') ?? '/');
  let destination = '/';
  try {
    const target = new URL(back, 'https://jmt-academy.invalid');
    if (target.origin === 'https://jmt-academy.invalid' && back.startsWith('/')) {
      destination = target.pathname + target.search + target.hash;
    }
  } catch {
    // Keep the safe home destination for malformed return paths.
  }
  redirect(destination);
}
