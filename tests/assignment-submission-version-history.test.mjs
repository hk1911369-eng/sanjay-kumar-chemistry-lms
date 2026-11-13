import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261111200000_add_assignment_submission_version_history.sql', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/academic/page.tsx', import.meta.url), 'utf8');

test('every assignment submission insert and material update creates an immutable version snapshot', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.assignment_submission_versions/i);
  assert.match(migration, /UNIQUE \(submission_id, version_number\)/i);
  assert.match(migration, /AFTER INSERT OR UPDATE OF answer_text, attachment_url, submitted_at, marks, teacher_feedback, graded_by, graded_at/i);
  assert.match(migration, /INSERT INTO public\.assignment_submission_versions/i);
  assert.match(migration, /MAX\(v\.version_number\)/i);
});

test('submission history is read-only and scoped to the student, admin or assigned course staff', () => {
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /GRANT SELECT ON TABLE public\.assignment_submission_versions TO authenticated/i);
  assert.match(migration, /student_id = \(SELECT auth\.uid\(\)\)/i);
  assert.match(migration, /public\.current_role\(\).*admin/i);
  assert.match(migration, /course_assignments ca/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.record_assignment_submission_version\(\) FROM PUBLIC, anon, authenticated/i);
});

test('academic workspace displays historical assignment versions to authorized readers', () => {
  assert.match(page, /assignment_submission_versions/i);
  assert.match(page, /Submission history/i);
  assert.match(page, /version_number/i);
});
