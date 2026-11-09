import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('students cannot forge assignment grades or mutate submission ownership', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109160000_lock_assignment_submission_grading_fields.sql', import.meta.url), 'utf8');
  assert.match(migration, /marks is null/i);
  assert.match(migration, /teacher_feedback is null/i);
  assert.match(migration, /graded_by is null/i);
  assert.match(migration, /graded_at is null/i);
  assert.match(migration, /revoke insert, update on table public\.assignment_submissions from authenticated/i);
  assert.match(migration, /grant insert \(assignment_id, student_id, answer_text, attachment_url, submitted_at\)/i);
  assert.match(migration, /grant update \(answer_text, attachment_url, submitted_at, marks, teacher_feedback, graded_by, graded_at\)/i);
  assert.match(migration, /e\.admission_fee_paid is true/i);
  assert.match(migration, /e\.paid_through >=/i);
});
