import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('quiz attempts cannot be updated directly by authenticated clients', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109282000_revoke_direct_quiz_attempt_updates.sql', import.meta.url), 'utf8');
  assert.match(migration, /revoke update on table public\.quiz_attempts from authenticated/i);
});
