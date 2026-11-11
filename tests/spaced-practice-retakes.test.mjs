import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261111130000_enable_spaced_practice_retries.sql', import.meta.url), 'utf8');
const followUpMigration = await readFile(new URL('../supabase/migrations/20261111140000_practice_review_fallback.sql', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/practice/page.tsx', import.meta.url), 'utf8');
const workspace = await readFile(new URL('../components/student-practice-workspace.tsx', import.meta.url), 'utf8');
const action = await readFile(new URL('../app/actions/student-practice.ts', import.meta.url), 'utf8');

test('practice retakes preserve immutable attempt history with a per-question sequence', () => {
  assert.match(migration, /DROP CONSTRAINT IF EXISTS student_practice_attempts_student_id_question_id_key/i);
  assert.match(migration, /attempt_number integer NOT NULL DEFAULT 1/i);
  assert.match(migration, /UNIQUE INDEX IF NOT EXISTS student_practice_attempts_question_attempt_uidx/i);
  assert.match(migration, /FOR UPDATE OF q/i);
  assert.match(migration, /MAX\(a\.attempt_number\)/i);
  assert.match(migration, /ON CONFLICT \(student_id, question_id, attempt_number\)/i);
  assert.doesNotMatch(migration, /ON CONFLICT \(student_id, question_id\) DO NOTHING/i);
});

test('previously attempted questions return only when their concept review is due', () => {
  assert.match(migration, /attempt_count integer/i);
  assert.match(migration, /max\(a\.answered_at\) AS last_attempt_at/i);
  assert.match(migration, /COALESCE\(attempts\.attempt_count, 0\) = 0[\s\S]*mastery\.next_review_at <= now\(\)/i);
  assert.match(followUpMigration, /attempts\.last_attempt_at <= now\(\) - interval '1 day'/i);
  assert.match(followUpMigration, /q\.concept_id IS NULL OR mastery\.next_review_at IS NULL/i);
  assert.match(page, /attempt_count: Number\(row\.attempt_count \?\? 0\)/i);
  assert.match(workspace, /Review question · previously attempted/i);
});

test('retakes do not increase mastery evidence count or mastery score', () => {
  const retake = migration.split('ELSE\n      -- Retakes verify retrieval')[1]?.split('END IF;')[0] ?? '';
  assert.match(migration, /IF v_attempt_number = 1 THEN/i);
  assert.match(retake, /last_practiced_at = now\(\)/i);
  assert.match(retake, /next_review_at = now\(\)/i);
  assert.doesNotMatch(retake, /mastery_score\s*=|evidence_count\s*=/i);
  assert.match(migration, /occurrence_count = existing\.occurrence_count \+ 1/i);
  assert.match(migration, /prevent_practice_question_history_rewrite/i);
  assert.match(migration, /create a new question version instead/i);
  assert.match(migration, /FUNCTION public\.prevent_practice_question_history_rewrite\(\)[\s\S]*?SET search_path = ''/i);
  assert.match(migration, /FUNCTION public\.schedule_revision_after_mastery_update\(\)[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = ''/i);
  assert.match(migration, /FUNCTION public\.prevent_practice_question_history_rewrite\(\)[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = ''/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.schedule_revision_after_mastery_update\(\) FROM PUBLIC, anon, authenticated/i);
});

test('verified mastery schedules one pending review task and updates only spaced-repetition tasks', () => {
  assert.match(migration, /schedule_revision_after_mastery_update/i);
  assert.match(migration, /'Review: ' \|\| left\(v_title, 172\)/i);
  assert.match(migration, /AFTER INSERT OR UPDATE OF mastery_score, next_review_at/i);
  assert.match(migration, /ON CONFLICT \(student_id, concept_id\)[\s\S]*source_type = 'spaced_repetition'/i);
});

test('attempt number is validated and surfaced through the server action and learner feedback', () => {
  assert.match(action, /attempt_number\?: number/i);
  assert.match(action, /attemptNumber: result\.attempt_number/i);
  assert.match(workspace, /attemptNumber: response\.attemptNumber/i);
  assert.match(workspace, /this repeat does not inflate mastery evidence/i);
});
