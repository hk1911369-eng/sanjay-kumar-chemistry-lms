import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('duplicate lesson-completion unique index is removed without dropping the invariant', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110141000_remove_duplicate_lesson_completion_index.sql', import.meta.url), 'utf8');
  const original = await readFile(new URL('../supabase/migrations/20261109190000_harden_learning_event_integrity.sql', import.meta.url), 'utf8');
  assert.match(migration, /drop index if exists public\.learning_events_one_lesson_completion/i);
  assert.match(original, /create unique index if not exists learning_events_one_lesson_completion_per_student/i);
});
