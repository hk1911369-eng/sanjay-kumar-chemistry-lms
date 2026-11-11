import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261111170000_refine_spaced_review_progression.sql', import.meta.url), 'utf8');

test('spaced review intervals count only completed spaced-repetition tasks for the same course and concept', () => {
  assert.match(migration, /course_id = v_course_id[\s\S]*concept_id = v_concept_id[\s\S]*source_type = 'spaced_repetition'[\s\S]*status = 'completed'/i);
});

test('teacher-assigned and exam-planning tasks do not automatically spawn spaced-repetition chains', () => {
  assert.match(migration, /v_source_type = 'spaced_repetition'/i);
  assert.match(migration, /SELECT course_id, concept_id, source_type, scheduled_for/i);
});

test('task completion retains due-date, publication, paid-enrollment and RPC permission gates', () => {
  assert.match(migration, /IF v_scheduled_for > now\(\)/i);
  assert.match(migration, /c\.is_published IS TRUE/i);
  assert.match(migration, /c\.archived_at IS NULL/i);
  assert.match(migration, /e\.status = 'active'/i);
  assert.match(migration, /e\.admission_fee_paid IS TRUE/i);
  assert.match(migration, /e\.paid_through >= v_period_end/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.complete_revision_task\(uuid\) FROM PUBLIC, anon/i);
});
