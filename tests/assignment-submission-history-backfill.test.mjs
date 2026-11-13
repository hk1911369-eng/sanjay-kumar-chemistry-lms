import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261111210000_backfill_assignment_submission_history.sql', import.meta.url), 'utf8');

test('existing assignment submissions receive a version-one snapshot without duplicating history', () => {
  assert.match(migration, /INSERT INTO public\.assignment_submission_versions/i);
  assert.match(migration, /s\.id, s\.assignment_id, s\.student_id, 1/i);
  assert.match(migration, /FROM public\.assignment_submissions s/i);
  assert.match(migration, /WHERE NOT EXISTS[\s\S]*v\.submission_id = s\.id/i);
});
