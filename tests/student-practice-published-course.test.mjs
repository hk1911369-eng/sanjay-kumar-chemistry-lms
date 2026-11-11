import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261111100000_require_published_course_for_student_practice.sql', import.meta.url),
  'utf8',
);

test('practice question delivery requires the parent course to be published and not archived', () => {
  const reader = migration
    .split('CREATE OR REPLACE FUNCTION public.get_student_practice_questions')[1]
    .split('CREATE OR REPLACE FUNCTION public.submit_student_practice_answer')[0];

  assert.match(reader, /JOIN public\.courses c ON c\.id = q\.course_id/i);
  assert.match(reader, /c\.is_published IS TRUE/i);
  assert.match(reader, /c\.archived_at IS NULL/i);
  assert.match(reader, /q\.is_published IS TRUE/i);
});

test('practice answer submission re-checks parent-course publication at the database boundary', () => {
  const submitter = migration
    .split('CREATE OR REPLACE FUNCTION public.submit_student_practice_answer')[1];

  assert.match(submitter, /JOIN public\.courses c ON c\.id = q\.course_id/i);
  assert.match(submitter, /c\.is_published IS TRUE/i);
  assert.match(submitter, /c\.archived_at IS NULL/i);
  assert.match(submitter, /q\.is_published IS TRUE/i);
  assert.match(submitter, /e\.admission_fee_paid IS TRUE/i);
  assert.match(submitter, /e\.paid_through >=/i);
});

test('practice RPC privileges remain limited to authenticated callers', () => {
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_student_practice_questions\(uuid,uuid,text,integer\) FROM PUBLIC, anon/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_student_practice_questions\(uuid,uuid,text,integer\) TO authenticated/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.submit_student_practice_answer\(uuid,integer\) FROM PUBLIC, anon/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.submit_student_practice_answer\(uuid,integer\) TO authenticated/i);
});
