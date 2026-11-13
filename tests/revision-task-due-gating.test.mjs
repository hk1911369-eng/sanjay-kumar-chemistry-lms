import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261111150000_enforce_revision_task_due_and_course_access.sql', import.meta.url), 'utf8');

test('revision tasks cannot be completed before their scheduled review time', () => {
  assert.match(migration, /SELECT course_id, concept_id, scheduled_for/i);
  assert.match(migration, /IF v_scheduled_for > now\(\)/i);
  assert.match(migration, /Revision task is not due yet/i);
});

test('revision completion requires a currently published, unarchived course and active paid enrollment', () => {
  assert.match(migration, /c\.is_published IS TRUE/i);
  assert.match(migration, /c\.archived_at IS NULL/i);
  assert.match(migration, /e\.status = 'active'/i);
  assert.match(migration, /e\.admission_fee_paid IS TRUE/i);
  assert.match(migration, /e\.paid_through >= v_period_end/i);
});

test('revision tasks only complete for published concepts and bounded task titles', () => {
  assert.match(migration, /lc\.is_published IS TRUE/i);
  assert.match(migration, /left\(coalesce\(v_concept_title, 'Learning topic'\), 172\)/i);
});
