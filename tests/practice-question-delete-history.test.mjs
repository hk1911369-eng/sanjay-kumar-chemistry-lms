import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261111170100_preserve_deleted_practice_history.sql', import.meta.url), 'utf8');

test('practice questions with attempts cannot be deleted and cascade away student history', () => {
  assert.match(migration, /IF TG_OP = 'DELETE' THEN/i);
  assert.match(migration, /FROM public\.student_practice_attempts a[\s\S]*WHERE a\.question_id = OLD\.id/i);
  assert.match(migration, /unpublish or archive it instead of deleting/i);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.student_practice_questions/i);
});
