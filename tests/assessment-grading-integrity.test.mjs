import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('assessment grading is bounded and students cannot forge grading metadata', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109170000_enforce_assessment_grading_integrity.sql', import.meta.url), 'utf8');
  assert.match(migration, /marks <= \(select a\.max_marks/i);
  assert.match(migration, /score <= \(select x\.total_marks/i);
  assert.match(migration, /teacher_feedback = ''/i);
  assert.match(migration, /new\.teacher_feedback <> ''/i);
  assert.match(migration, /teaching staff cannot alter a student assignment response/i);
  assert.match(migration, /teaching staff cannot alter a student written-exam response/i);
  assert.match(migration, /revoke insert, update on table public\.written_exam_submissions from authenticated/i);
  assert.match(migration, /guard_assessment_submission_edits/i);
});
