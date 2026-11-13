import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('students cannot start quiz attempts for unpublished or archived courses', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113200000_require_active_course_for_quiz_attempt_start.sql', import.meta.url), 'utf8');
  assert.match(migration, /DROP POLICY IF EXISTS "students create own quiz attempts"/i);
  assert.match(migration, /CREATE POLICY "students create own quiz attempts"/i);
  assert.match(migration, /JOIN public\.courses c ON c\.id = q\.course_id/i);
  assert.match(migration, /c\.is_published IS TRUE/i);
  assert.match(migration, /c\.archived_at IS NULL/i);
  assert.match(migration, /q\.published IS TRUE/i);
  assert.match(migration, /e\.status = 'active'/i);
  assert.match(migration, /e\.admission_fee_paid IS TRUE/i);
  assert.match(migration, /e\.paid_through >=/i);
});

test('quiz attempt start restrictions preserve student ownership and server-owned result fields', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113200000_require_active_course_for_quiz_attempt_start.sql', import.meta.url), 'utf8');
  assert.match(migration, /current_role\(\).*student/i);
  assert.match(migration, /student_id = \(SELECT auth\.uid\(\)\)/i);
  assert.match(migration, /answers = '\{\}'::jsonb/i);
  assert.match(migration, /submitted_at IS NULL/i);
  assert.match(migration, /score IS NULL/i);
  assert.match(migration, /total_marks IS NULL/i);
  assert.match(migration, /started_at <= now\(\) \+ interval '30 seconds'/i);
  assert.match(migration, /q\.starts_at IS NULL OR q\.starts_at <= now\(\)/i);
  assert.match(migration, /q\.ends_at IS NULL OR q\.ends_at >= now\(\)/i);
});
