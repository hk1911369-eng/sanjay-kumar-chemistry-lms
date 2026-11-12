'use client';

import { createBrowserClient } from '@supabase/ssr';

let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase browser configuration is unavailable');
  browserClientInstance ??= createBrowserClient(url, key);
  return browserClientInstance;
}
