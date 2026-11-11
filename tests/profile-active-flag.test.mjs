import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('profile activation flag is present and defaults safely to active', async () => {
  const migration = await readFile(new URL('../supabase/migrations/0047_profile_active_flag.sql', import.meta.url), 'utf8');
  assert.match(migration, /alter table public\.profiles/i);
  assert.match(migration, /add column if not exists is_active boolean not null default true/i);
  assert.doesNotMatch(migration, /update public\.profiles/i);
});
