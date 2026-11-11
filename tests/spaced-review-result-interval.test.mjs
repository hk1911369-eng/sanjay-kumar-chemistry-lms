import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261111181000_align_review_interval_with_verified_result.sql', import.meta.url), 'utf8');

test('the latest concept mastery review date controls the next spaced-repetition task', () => {
  assert.match(migration, /SELECT next_review_at INTO v_mastery_next_review_at/i);
  assert.match(migration, /v_mastery_next_review_at > now\(\) THEN v_mastery_next_review_at/i);
  assert.match(migration, /ELSE now\(\) \+ make_interval\(days => v_next_interval\)/i);
  assert.match(migration, /v_follow_up_at, 3/i);
});

test('a recent incorrect answer can shorten a long-standing review cycle', () => {
  assert.match(migration, /next_review_at = now\(\) \+ CASE[\s\S]*WHEN v_correct THEN interval '3 days'[\s\S]*ELSE interval '1 day'/i);
  assert.match(migration, /v_follow_up_at := CASE[\s\S]*v_mastery_next_review_at > now\(\)/i);
});

test('evidence and eligibility gates remain present in the revised completion RPC', () => {
  assert.match(migration, /e\.occurred_at >= v_scheduled_for/i);
  assert.match(migration, /e\.event_type IN \('practice_submitted', 'exam_submitted'\)/i);
  assert.match(migration, /c\.archived_at IS NULL/i);
  assert.match(migration, /e\.admission_fee_paid IS TRUE/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.complete_revision_task\(uuid\) TO authenticated/i);
});
