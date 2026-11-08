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

test('reusable quiz questions aggregate recurring errors and resolve after a correct answer', async () => {
  const identity = await readFile(new URL('../supabase/migrations/20261108215214_learning_os_reusable_question_identity_and_mistake_resolution.sql', import.meta.url), 'utf8');
  const aggregate = await readFile(new URL('../supabase/migrations/20261108215223_learning_os_aggregate_repeated_bank_question_mistakes.sql', import.meta.url), 'utf8');
  const finalise = await readFile(new URL('../supabase/migrations/20261108215412_learning_os_finalize_question_bank_mistake_memory.sql', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/academic.ts', import.meta.url), 'utf8');
  assert.ok(identity.includes('source_bank_question_id'));
  assert.ok(identity.includes('resolved_at = NEW.submitted_at'));
  assert.ok(aggregate.includes('question_bank_id'));
  assert.ok(aggregate.includes('occurrence_count=existing.occurrence_count+1'));
  assert.ok(finalise.includes('DROP COLUMN IF EXISTS source_bank_question_id'));
  assert.ok(finalise.includes('COALESCE(x.question_bank_id,x.id)'));
  assert.ok(finalise.includes('SET resolved_at=NEW.submitted_at'));
  assert.ok(action.includes('question_bank_id:q.id'));
  assert.equal(action.includes('source_bank_question_id:q.id'), false);
});


test('quiz submission enforces schedule, paid access and question-option integrity', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108215856_learning_os_enforce_quiz_schedule_and_answer_integrity.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes("public.current_role() IS DISTINCT FROM 'student'::public.app_role"));
  assert.ok(migration.includes("q.published"));
  assert.ok(migration.includes('q.starts_at'));
  assert.ok(migration.includes('q.ends_at'));
  assert.ok(migration.includes('e.paid_through'));
  assert.ok(migration.includes('jsonb_each_text(p_answers)'));
  assert.ok(migration.includes('jsonb_array_length(x.options)'));
  assert.ok(migration.includes('FOR UPDATE'));
});
