import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('assignment grading uses a narrow RPC instead of revoked client column grants', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113240000_secure_assignment_grading_rpc.sql', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/academic.ts', import.meta.url), 'utf8');

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.grade_assignment_submission/i);
  assert.match(migration, /SECURITY DEFINER[\s\S]*SET search_path = pg_catalog, public, pg_temp/i);
  assert.match(migration, /public\.current_role\(\)/i);
  assert.match(migration, /'admin'::public\.app_role[\s\S]*'teacher'::public\.app_role[\s\S]*'staff'::public\.app_role/i);
  assert.match(migration, /FOR UPDATE OF s/i);
  assert.match(migration, /public\.course_assignments ca[\s\S]*ca\.course_id = v_course_id[\s\S]*ca\.teacher_id = v_actor_id/i);
  assert.match(migration, /p_marks > v_max_marks/i);
  assert.match(migration, /length\(p_feedback\) > 4000/i);
  assert.match(migration, /graded_by = v_actor_id[\s\S]*graded_at = now\(\)/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.grade_assignment_submission[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.grade_assignment_submission[\s\S]*TO authenticated/i);

  assert.match(action, /rpc\('grade_assignment_submission'/i);
  assert.doesNotMatch(action, /from\('assignment_submissions'\)\.update\(\{marks,teacher_feedback,graded_by,graded_at/i);
});
