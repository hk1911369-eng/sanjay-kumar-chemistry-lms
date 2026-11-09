import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('students can only transition lesson progress to completed once with server-near timestamps', async () => {
  const migration = await read('supabase/migrations/20261109200000_harden_lesson_progress_integrity.sql');
  const action = await read('app/actions/learning.ts');
  assert.match(migration, /completed is not true/i);
  assert.match(migration, /completed_at >= now\(\) - interval '10 minutes'/i);
  assert.match(migration, /completed_at <= now\(\) \+ interval '30 seconds'/i);
  assert.match(migration, /revoke insert, update on table public\.lesson_progress from authenticated/i);
  assert.match(migration, /grant update \(completed, completed_at, updated_at\)/i);
  assert.match(action, /select\('id,completed'\)/);
  assert.match(action, /existingProgress\.completed/);
  assert.doesNotMatch(action, /from\('lesson_progress'\)\.upsert/);
});
