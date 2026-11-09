import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('written exam answers are bounded and must match every exam question', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109250000_validate_written_exam_answers.sql', import.meta.url), 'utf8');
  assert.match(migration, /jsonb_typeof\(answers\) = 'object'/i);
  assert.match(migration, /jsonb_object_keys\(answers\)/i);
  assert.match(migration, /jsonb_object_keys\\(answers\\)\\)\\s*=\\s*\\(\\s*select count\\(\\*\\) from public\\.written_exam_questions/i);
  assert.match(migration, /length\(answer\.value #>> '\{\}'\) > 12000/i);
  assert.match(migration, /q\.id::text = answer\.key/i);
});
