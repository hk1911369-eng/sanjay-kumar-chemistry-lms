import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('discussion pin RPC fails closed when the current role is null', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109283100_fail_closed_discussion_pin_role.sql', import.meta.url), 'utf8');
  assert.match(migration, /v_role is null\s+or\s+v_role not in/i);
  assert.match(migration, /set search_path = pg_catalog, public, pg_temp/i);
  assert.match(migration, /revoke all on function public\.set_lesson_discussion_pin/i);
});
