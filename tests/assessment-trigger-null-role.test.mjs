import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('assessment integrity trigger fails closed for null roles', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110262000_fail_closed_assessment_trigger_role.sql', import.meta.url), 'utf8');
  assert.match(migration, /v_role IS NULL OR v_role NOT IN \('teacher', 'staff'\)/);
  assert.match(migration, /Active teaching staff role required/);
  assert.match(migration, /SECURITY INVOKER/);
  assert.match(migration, /SET search_path TO 'pg_catalog', 'public', 'pg_temp'/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.enforce_assessment_content_draft_integrity\(\) FROM PUBLIC, anon, authenticated/);
});
