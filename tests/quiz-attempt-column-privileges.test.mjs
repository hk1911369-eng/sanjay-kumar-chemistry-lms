import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('students cannot supply quiz attempt IDs, scores or submission metadata', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109220000_limit_quiz_attempt_insert_columns.sql', import.meta.url), 'utf8');
  assert.match(migration, /revoke insert on table public\.quiz_attempts from authenticated/i);
  assert.match(migration, /grant insert \(quiz_id, student_id, answers, started_at\)/i);
  for (const forbidden of ['score','total_marks','submitted_at','id']) {
    assert.doesNotMatch(migration, new RegExp('grant insert[^;]*\\b' + forbidden + '\\b','i'));
  }
});
