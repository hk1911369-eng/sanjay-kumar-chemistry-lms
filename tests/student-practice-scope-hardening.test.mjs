import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('practice content must belong to an active course and a published concept', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261109293000_harden_student_practice_content_scope.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /c\.id = NEW\.course_id AND c\.archived_at IS NULL/i);
  assert.match(migration, /lc\.id = NEW\.concept_id[\s\S]*lc\.is_published IS TRUE/i);
  assert.match(migration, /c\.archived_at IS NULL/i);
  assert.match(migration, /lc\.is_published IS TRUE/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.guard_student_practice_question_scope\(\) FROM PUBLIC, anon, authenticated/i);
});

test('student question delivery and grading re-check active course and published concept scope', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261109293000_harden_student_practice_content_scope.sql', import.meta.url),
    'utf8',
  );
  const questionReader = migration.split('CREATE OR REPLACE FUNCTION public.get_student_practice_questions')[1]
    .split('CREATE OR REPLACE FUNCTION public.submit_student_practice_answer')[0];
  const answerSubmitter = migration.split('CREATE OR REPLACE FUNCTION public.submit_student_practice_answer')[1];
  for (const body of [questionReader, answerSubmitter]) {
    assert.match(body, /c\.archived_at IS NULL/i);
    assert.match(body, /lc\.is_published IS TRUE/i);
    assert.match(body, /e\.admission_fee_paid IS TRUE/i);
    assert.match(body, /e\.paid_through >=/i);
  }
});
