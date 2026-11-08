import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('new student IDs use JMT prefix without rewriting historical IDs', async () => {
  const migration = await read('supabase/migrations/0039_jmt_student_code_prefix.sql');
  assert.match(migration, /'JMT-'/);
  assert.doesNotMatch(migration, /update public\\.profiles/i);
});

test('public pages use a non-session Supabase client and can be revalidated', async () => {
  for (const path of ['app/page.tsx','app/courses/page.tsx','app/courses/[slug]/page.tsx','app/contact/page.tsx']) {
    const source = await read(path);
    assert.match(source, /createPublicClient/);
    assert.match(source, /export const revalidate = 300/);
    assert.doesNotMatch(source, /createClient from '@\\/lib\\/supabase\\/server'/);
  }
  const client = await read('lib/supabase/public.ts');
  assert.match(client, /persistSession: false/);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(client, /SERVICE_ROLE/);
});

test('middleware refreshes Supabase auth only for protected route prefixes', async () => {
  const middleware = await read('middleware.ts');
  assert.match(middleware, /protectedPrefixes/);
  assert.match(middleware, /updateSession\(request\)/);
  assert.match(middleware, /skc_locale/);
});

test('security headers include a restrictive content security policy', async () => {
  const config = await read('next.config.ts');
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /object-src 'none'/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /X-Content-Type-Options/);
});

test('new language cookie keeps a one-time legacy cookie fallback', async () => {
  const action = await read('app/actions/language.ts');
  const switcher = await read('components/locale-switcher.tsx');
  const layout = await read('app/layout.tsx');
  assert.match(action, /jmt_locale/);
  assert.match(action, /skc_locale/);
  assert.match(switcher, /jmt_locale/);
  assert.match(layout, /LocaleDocumentLanguage/);
  assert.doesNotMatch(layout, /cookies\(\)/);
});
