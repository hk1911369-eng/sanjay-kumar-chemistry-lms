import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('practice engine indexes all new foreign keys and avoids per-row JWT helper evaluation', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261109291000_optimize_student_practice_rls_and_indexes.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /student_practice_attempts_question_idx[\s\S]*on public\.student_practice_attempts\(question_id\)/i);
  assert.match(migration, /student_practice_questions_subject_idx[\s\S]*on public\.student_practice_questions\(subject_id\)/i);
  assert.match(migration, /student_practice_questions_created_by_idx[\s\S]*on public\.student_practice_questions\(created_by\)/i);
  assert.doesNotMatch(migration, /(?<!select )auth\.uid\(\)/i);
  assert.doesNotMatch(migration, /(?<!select )public\.current_role\(\)/i);
});
