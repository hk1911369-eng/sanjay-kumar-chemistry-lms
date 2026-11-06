'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
export async function setLanguage(formData: FormData) {
  const value = String(formData.get('locale') ?? 'bn');
  const locale: Locale = value === 'en' ? 'en' : 'bn';
  const store = await cookies();
  store.set('skc_locale', locale, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  const back = String(formData.get('return_to') ?? '/');
  redirect(back.startsWith('/') && !back.startsWith('//') ? back : '/');
}
