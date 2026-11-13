import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('current_role returns no role for inactive or missing profiles', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261113170000_require_active_profiles_in_current_role.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.current_role\(\)/i);
  assert.match(sql, /SECURITY DEFINER/i);
  assert.match(sql, /SET search_path = pg_catalog, public, pg_temp/i);
  assert.match(sql, /WHERE p\.id = auth\.uid\(\)[\s\S]*AND p\.is_active IS TRUE/i);
});

test('role helper remains unavailable to anonymous callers and executable by authenticated sessions', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261113170000_require_active_profiles_in_current_role.sql', import.meta.url), 'utf8');
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.current_role\(\) FROM PUBLIC, anon/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.current_role\(\) TO authenticated, service_role/i);
});

test('the role helper hardening does not modify profiles or learner records', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261113170000_require_active_profiles_in_current_role.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(sql, /\b(INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|TRUNCATE\s+TABLE|DROP\s+TABLE)\b/i);
});
