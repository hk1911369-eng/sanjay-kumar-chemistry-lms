import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('quiz submission is blocked when its course is unpublished or archived', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261113190000_guard_quiz_submission_course_access.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.guard_quiz_submission_course_access\(\)/i);
  assert.match(sql, /JOIN public\.courses c ON c\.id = q\.course_id/i);
  assert.match(sql, /q\.published IS TRUE[\s\S]*c\.is_published IS TRUE[\s\S]*c\.archived_at IS NULL/i);
  assert.match(sql, /BEFORE UPDATE OF submitted_at ON public\.quiz_attempts/i);
  assert.match(sql, /OLD\.submitted_at IS NULL AND NEW\.submitted_at IS NOT NULL/i);
  assert.match(sql, /USING ERRCODE = '42501'/i);
});

test('quiz submission guard is trigger-only and not directly executable by API roles', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261113190000_guard_quiz_submission_course_access.sql', import.meta.url), 'utf8');
  assert.match(sql, /SECURITY DEFINER[\s\S]*SET search_path = ''/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.guard_quiz_submission_course_access\(\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i);
  assert.doesNotMatch(sql, /\b(INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|TRUNCATE\s+TABLE)\b/i);
});
