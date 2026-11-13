import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('staff profile access from payment onboarding ends when a submission is rejected or approved', async () => {
  const migration = await read('supabase/migrations/20261109120000_limit_staff_profile_access_to_pending_payments.sql');
  assert.match(migration, /create or replace function public\.can_staff_access_student\(p_student_id uuid\)/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = pg_catalog, public, pg_temp/i);
  assert.match(migration, /join public\.course_assignments a on a\.course_id = m\.course_id/i);
  assert.match(migration, /m\.status = 'pending_review'/i);
  assert.match(migration, /public\.enrollments e/i);
  assert.doesNotMatch(migration, /m\.status\s*(?:<>|!=|not in)/i);
});
