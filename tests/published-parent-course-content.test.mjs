import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = '../supabase/migrations/20261113160000_require_published_parent_course_for_content_reads.sql';

test('restrictive parent-course publication guards cover all student course-content read paths', async () => {
  const sql = await readFile(new URL(migrationPath, import.meta.url), 'utf8');
  const tables = ['assignments','chapters','lessons','lesson_resources','live_classes','quizzes','written_exams','quiz_questions','written_exam_questions','course_subjects'];
  for (const table of tables) {
    assert.match(sql, new RegExp('CREATE POLICY "published parent course read guard"\\s+ON public\\.' + table + ' AS RESTRICTIVE FOR SELECT TO authenticated'));
  }
  assert.equal((sql.match(/CREATE POLICY "published parent course read guard"/g) ?? []).length, 10);
});

test('student access requires active student role and a published, unarchived parent course', async () => {
  const sql = await readFile(new URL(migrationPath, import.meta.url), 'utf8');
  assert.equal((sql.match(/\(SELECT public\.current_role\(\)\) = 'student'::public\.app_role/g) ?? []).length, 9);
  assert.equal((sql.match(/c\.is_published IS TRUE/g) ?? []).length, 10);
  assert.equal((sql.match(/c\.archived_at IS NULL/g) ?? []).length, 10);
});

test('admin and teaching-staff roles remain allowed by the restrictive guard and existing policies retain row scope', async () => {
  const sql = await readFile(new URL(migrationPath, import.meta.url), 'utf8');
  assert.equal((sql.match(/'admin'::public\.app_role, 'teacher'::public\.app_role, 'staff'::public\.app_role/g) ?? []).length, 10);
  assert.match(sql, /Existing permissive policies continue to decide which assigned staff and paid/);
});

test('migration is read-policy-only and does not rewrite course or learner records', async () => {
  const sql = await readFile(new URL(migrationPath, import.meta.url), 'utf8');
  assert.doesNotMatch(sql, /\b(INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|TRUNCATE\s+TABLE|DROP\s+TABLE)\b/i);
});
