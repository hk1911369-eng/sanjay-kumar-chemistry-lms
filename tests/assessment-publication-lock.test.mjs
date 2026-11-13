import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('teachers can only create draft assessments and published assessment content is locked', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110115355_lock_published_assessment_content.sql', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/academic.ts', import.meta.url), 'utf8');
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.enforce_assessment_content_draft_integrity/);
  for (const table of ['assignments', 'quizzes', 'written_exams']) {
    assert.match(migration, new RegExp('ON public\\.' + table));
  }
  for (const table of ['quiz_questions', 'quiz_answer_keys', 'written_exam_questions', 'written_exam_answer_keys']) {
    assert.match(migration, new RegExp('ON public\\.' + table));
  }
  assert.match(migration, /v_role IS NULL OR v_role NOT IN \('teacher', 'staff'\)/);
  assert.match(migration, /OLD\.published IS TRUE OR NEW\.published IS TRUE/);
  assert.match(migration, /Only administrators may publish assessments/);
  assert.match(migration, /Questions and answer keys for published assessments are locked/);
  assert.match(migration, /v_published IS NULL AND TG_OP <> 'DELETE'/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.enforce_assessment_content_draft_integrity\(\) FROM PUBLIC, anon, authenticated/);
  assert.equal((action.match(/published:role==='admin'&&formData\.get\('published'\)==='on'/g) ?? []).length, 4);
});
