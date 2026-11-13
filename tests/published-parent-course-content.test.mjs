import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = '../supabase/migrations/20261113160000_require_published_parent_course_for_content_reads.sql';
const policyName = 'CREATE POLICY "published parent course read guard"';

test('restrictive parent-course publication guards cover all student course-content read paths', async () => {
  const sql = await readFile(new URL(migrationPath, import.meta.url), 'utf8');
  const tables = ['assignments','chapters','lessons','lesson_resources','live_classes','quizzes','written_exams','quiz_questions','written_exam_questions','course_subjects','courses'];
  for (const table of tables) {
    assert.ok(sql.includes(policyName + '\\nON public.' + table + ' AS RESTRICTIVE FOR SELECT TO authenticated'), table);
  }
  assert.equal(sql.split(policyName).length - 1, 11);
});

test('student content access requires published and unarchived parent courses', async () => {
  const sql = await readFile(new URL(migrationPath, import.meta.url), 'utf8');
  assert.equal(sql.split("(SELECT public.current_role()) = 'student'::public.app_role").length - 1, 10);
  assert.equal(sql.split('c.is_published IS TRUE').length - 1, 10);
  assert.equal(sql.split('c.archived_at IS NULL').length - 1, 10);
  assert.ok(sql.includes('ON public.courses AS RESTRICTIVE FOR SELECT TO authenticated'));
  assert.ok(sql.includes('AND is_published IS TRUE\n    AND archived_at IS NULL'));
});

test('admin and teaching-staff roles remain allowed by the restrictive guard and existing policies retain row scope', async () => {
  const sql = await readFile(new URL(migrationPath, import.meta.url), 'utf8');
  assert.equal(sql.split("'admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role").length - 1, 11);
  assert.ok(sql.includes('Existing permissive policies continue to decide which assigned staff and paid'));
});

test('migration is read-policy-only and does not rewrite course or learner records', async () => {
  const sql = await readFile(new URL(migrationPath, import.meta.url), 'utf8');
  for (const forbidden of ['INSERT INTO', 'UPDATE public.', 'DELETE FROM', 'TRUNCATE TABLE', 'DROP TABLE']) {
    assert.equal(sql.includes(forbidden), false, forbidden);
  }
});
