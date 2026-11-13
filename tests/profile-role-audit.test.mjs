import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('profile role changes are written to the audit log by a database trigger', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261113230000_audit_profile_role_changes.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.audit_profile_role_change\(\)/i);
  assert.match(sql, /SECURITY DEFINER[\s\S]*SET search_path = 'pg_catalog', 'public', 'pg_temp'/i);
  assert.match(sql, /OLD\.role IS DISTINCT FROM NEW\.role/i);
  assert.match(sql, /INSERT INTO public\.audit_logs[\s\S]*'profile_role_changed'[\s\S]*'old_role'[\s\S]*'new_role'/i);
  assert.match(sql, /AFTER UPDATE OF role ON public\.profiles[\s\S]*WHEN \(OLD\.role IS DISTINCT FROM NEW\.role\)/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.audit_profile_role_change\(\)[\s\S]*FROM PUBLIC, anon, authenticated/i);
});

test('profile role audit trigger does not change profile roles or grant direct audit-log writes', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261113230000_audit_profile_role_changes.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(sql, /\bUPDATE\s+public\.profiles\b|\bDELETE\s+FROM\s+public\.audit_logs\b|\bGRANT\s+.*\b(?:INSERT|UPDATE|DELETE)\b.*\baudit_logs\b/i);
});
