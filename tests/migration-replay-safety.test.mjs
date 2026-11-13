import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('assignment submission history migration safely recreates its existing policy on replay', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261111200000_add_assignment_submission_version_history.sql', import.meta.url), 'utf8');
  const drop = sql.search(/DROP POLICY IF EXISTS "assignment submission versions visible to owner and assigned staff"/i);
  const create = sql.search(/CREATE POLICY "assignment submission versions visible to owner and assigned staff"/i);

  assert.notEqual(drop, -1, 'replay must drop the named policy before recreating it');
  assert.notEqual(create, -1, 'migration must recreate the policy');
  assert.ok(drop < create, 'DROP POLICY must precede CREATE POLICY');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.assignment_submission_versions/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS assignment_submission_versions_student_assignment_idx/i);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.record_assignment_submission_version/i);
  assert.match(sql, /DROP TRIGGER IF EXISTS record_assignment_submission_version/i);
});
