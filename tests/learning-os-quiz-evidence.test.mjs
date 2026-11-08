import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('quiz questions can be tagged to concepts only within their course subjects', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108214832_learning_os_quiz_concept_evidence_and_mistake_memory.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('ALTER TABLE public.question_bank'));
  assert.ok(migration.includes('ALTER TABLE public.quiz_questions'));
  assert.ok(migration.includes('guard_question_bank_concept'));
  assert.ok(migration.includes('guard_quiz_question_concept'));
  assert.ok(migration.includes('lc.subject_id = cs.subject_id'));
  assert.ok(migration.includes('Question concept must belong to one of the course subjects'));
});

test('trusted quiz grading creates concept mastery, revision and mistake memory', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108214832_learning_os_quiz_concept_evidence_and_mistake_memory.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('CREATE OR REPLACE FUNCTION public.capture_quiz_learning_evidence()'));
  assert.ok(migration.includes("'exam_submitted'"));
  assert.ok(migration.includes('public.learner_concept_mastery'));
  assert.ok(migration.includes('public.revision_tasks'));
  assert.ok(migration.includes('public.learner_mistake_memory'));
  assert.ok(migration.includes('source_question_id'));
  assert.ok(migration.includes('occurrence_count = existing.occurrence_count + 1'));
  assert.ok(migration.includes('OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL'));
  assert.ok(migration.includes('REVOKE ALL ON FUNCTION public.capture_quiz_learning_evidence() FROM PUBLIC, anon, authenticated'));
});

test('teacher question bank UI and quiz builder preserve concept tags into assessment questions', async () => {
  const action = await readFile(new URL('../app/actions/academic.ts', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/academic/page.tsx', import.meta.url), 'utf8');
  assert.ok(action.includes("const conceptId=String(formData.get('concept_id')||'').trim()||null"));
  assert.ok(action.includes('concept_id:conceptId'));
  assert.ok(action.includes('marks,concept_id'));
  assert.ok(action.includes('concept_id:q.concept_id'));
  assert.ok(page.includes('name="concept_id"'));
  assert.ok(page.includes('questionConcepts.map'));
});
