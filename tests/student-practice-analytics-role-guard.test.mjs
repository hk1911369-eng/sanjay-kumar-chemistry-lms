import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('staff analytics RPC denies unauthenticated and missing-role callers', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261109297000_deny_null_role_practice_analytics.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /auth\.uid\(\) IS NULL/i);
  assert.match(migration, /COALESCE\(public\.current_role\(\)::text, ''\) NOT IN \('admin', 'teacher', 'staff'\)/i);
  assert.match(migration, /RAISE EXCEPTION 'Teaching staff access required'/i);
});
