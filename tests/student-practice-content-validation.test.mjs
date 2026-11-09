import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('database trigger rejects malformed practice option arrays and invalid correct-option indexes', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261109292000_validate_practice_question_content.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /jsonb_typeof\(NEW\.options\) IS DISTINCT FROM 'array'/i);
  assert.match(migration, /jsonb_array_length\(NEW\.options\) NOT BETWEEN 2 AND 6/i);
  assert.match(migration, /jsonb_typeof\(v_option\) IS DISTINCT FROM 'string'/i);
  assert.match(migration, /length\(btrim\(v_option #>> '\{\}'\)\) = 0/i);
  assert.match(migration, /NEW\.correct_option >= jsonb_array_length\(NEW\.options\)/i);
});

test('database trigger preserves course-subject and concept-subject integrity and is not client callable', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261109292000_validate_practice_question_content.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /cs\.course_id = NEW\.course_id AND cs\.subject_id = NEW\.subject_id/i);
  assert.match(migration, /lc\.id = NEW\.concept_id AND lc\.subject_id = NEW\.subject_id/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.guard_student_practice_question_scope\(\) FROM PUBLIC, anon, authenticated/i);
});
