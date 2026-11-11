import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261111180000_require_retrieval_evidence_for_spaced_review.sql', import.meta.url), 'utf8');

test('spaced review completion requires a new concept-linked practice or assessment event after the due time', () => {
  assert.match(migration, /v_source_type = 'spaced_repetition' AND NOT EXISTS/i);
  assert.match(migration, /e\.student_id = auth\.uid\(\)/i);
  assert.match(migration, /e\.course_id = v_course_id/i);
  assert.match(migration, /e\.concept_id = v_concept_id/i);
  assert.match(migration, /e\.event_type IN \('practice_submitted', 'exam_submitted'\)/i);
  assert.match(migration, /e\.occurred_at >= v_scheduled_for/i);
  assert.match(migration, /Complete a concept-linked practice question or assessment/i);
});

test('fresh practice evidence does not silently postpone an already-due review task', () => {
  assert.match(migration, /WHEN existing_task\.scheduled_for <= now\(\) THEN existing_task\.scheduled_for/i);
  assert.match(migration, /ELSE EXCLUDED\.scheduled_for/i);
});

test('revision progression remains limited to completed spaced-repetition tasks in the same course', () => {
  assert.match(migration, /v_source_type = 'spaced_repetition'/i);
  assert.match(migration, /course_id = v_course_id[\s\S]*concept_id = v_concept_id[\s\S]*source_type = 'spaced_repetition'[\s\S]*status = 'completed'/i);
  assert.match(migration, /now\(\) \+ make_interval\(days => v_next_interval\)/i);
});

test('existing access, publication, due-date and privilege gates remain enforced', () => {
  assert.match(migration, /IF v_scheduled_for > now\(\)/i);
  assert.match(migration, /c\.is_published IS TRUE/i);
  assert.match(migration, /c\.archived_at IS NULL/i);
  assert.match(migration, /lc\.is_published IS TRUE/i);
  assert.match(migration, /e\.status = 'active'/i);
  assert.match(migration, /e\.admission_fee_paid IS TRUE/i);
  assert.match(migration, /e\.paid_through >= v_period_end/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.complete_revision_task\(uuid\) FROM PUBLIC, anon/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.complete_revision_task\(uuid\) TO authenticated/i);
});
