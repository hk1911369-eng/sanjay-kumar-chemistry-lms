import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261111120000_rank_practice_questions_by_learning_need.sql', import.meta.url),
  'utf8',
);
const page = await readFile(
  new URL('../app/practice/page.tsx', import.meta.url),
  'utf8',
);
const workspace = await readFile(
  new URL('../components/student-practice-workspace.tsx', import.meta.url),
  'utf8',
);

test('adaptive practice ranking uses mistake memory, due reviews and low mastery evidence', () => {
  assert.match(migration, /learner_mistake_memory mm/i);
  assert.match(migration, /mm\.resolved_at IS NULL/i);
  assert.match(migration, /mastery\.next_review_at <= now\(\)/i);
  assert.match(migration, /mastery\.evidence_count >= 3[\s\S]*mastery\.mastery_score <= 0\.65/i);
  assert.match(migration, /q\.difficulty = 'easy'/i);
  assert.match(migration, /q\.difficulty = 'hard'/i);
});

test('adaptive practice retains publication, paid access and answer-key protections', () => {
  assert.match(migration, /c\.is_published IS TRUE/i);
  assert.match(migration, /c\.archived_at IS NULL/i);
  assert.match(migration, /q\.is_published IS TRUE/i);
  assert.match(migration, /e\.admission_fee_paid IS TRUE/i);
  assert.match(migration, /e\.paid_through >=/i);
  assert.match(migration, /NOT EXISTS \([\s\S]*student_practice_attempts/i);
  assert.doesNotMatch(migration, /correct_option|explanation/);
});

test('adaptive selection reason is returned by the page and shown to the student', () => {
  assert.match(migration, /selection_reason text/i);
  assert.match(page, /selection_reason: string/i);
  assert.match(page, /selection_reason: row\.selection_reason/i);
  assert.match(workspace, /selection_reason: string/i);
  assert.match(workspace, /Why this question:/i);
});
