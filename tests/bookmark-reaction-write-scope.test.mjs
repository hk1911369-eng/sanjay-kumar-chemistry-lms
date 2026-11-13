import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('bookmark and reaction clients can only create the intended preference fields', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109270000_scope_bookmark_and_reaction_writes.sql', import.meta.url), 'utf8');
  assert.match(migration, /revoke insert, update on table public\.lesson_bookmarks from authenticated/i);
  assert.match(migration, /grant insert \(lesson_id, student_id\)/i);
  assert.match(migration, /revoke insert, update on table public\.lesson_discussion_reactions from authenticated/i);
  assert.match(migration, /grant insert \(discussion_id, user_id, reaction\)/i);
});
