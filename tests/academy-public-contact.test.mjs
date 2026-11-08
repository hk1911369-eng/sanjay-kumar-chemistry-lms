import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('academy profile accepts only HTTPS Facebook links and saves the public page', async () => {
  const action = await read('app/actions/academy-settings.ts');
  const settings = await read('app/admin/settings/page.tsx');
  const migration = await read('supabase/migrations/0035_academy_facebook_profile.sql');
  assert.match(action, /facebook_url:facebookUrl\|\|null/);
  assert.match(action, /parsed\.hostname==='facebook\.com'/);
  assert.match(settings, /name="facebook_url"/);
  assert.match(migration, /add column if not exists facebook_url text/i);
});

test('public contact page displays Facebook and formats Bangladesh WhatsApp links internationally', async () => {
  const page = await read('app/contact/page.tsx');
  assert.match(page, /facebook_url/);
  assert.match(page, /Visit our Facebook page/);
  assert.ok(page.includes(".replace(/^0/,'880')"));
  assert.match(page, /https:\/\/wa\.me\//);
});
