import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('new exam plans require a published, non-archived course and active paid enrollment', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261113220000_require_published_course_for_exam_plans.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.create_exam_war_room_target/i);
  assert.match(sql, /public\.current_role\(\) IS DISTINCT FROM 'student'/i);
  assert.match(sql, /e\.status = 'active'/i);
  assert.match(sql, /e\.admission_fee_paid IS TRUE/i);
  assert.match(sql, /e\.paid_through >= v_period_end/i);
  assert.match(sql, /c\.is_published IS TRUE/i);
  assert.match(sql, /c\.archived_at IS NULL/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.create_exam_war_room_target/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.create_exam_war_room_target/i);
});

test('exam plan migration preserves target limits and generated revision-task scheduling', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261113220000_require_published_course_for_exam_plans.sql', import.meta.url), 'utf8');
  assert.match(sql, /v_active_count >= 3/i);
  assert.match(sql, /INSERT INTO public\.learner_exam_targets/i);
  assert.match(sql, /INSERT INTO public\.revision_tasks/i);
  assert.match(sql, /ON CONFLICT\(student_id,concept_id\)/i);
  assert.match(sql, /SET plan_generated_at = now\(\)/i);
});
