import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('practice analytics has a covering index for its rolling time window', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261109296000_index_practice_attempt_time_window.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /ON public\.student_practice_attempts \(answered_at DESC, question_id\)/i);
  assert.match(migration, /INCLUDE \(selected_option, is_correct\)/i);
});
