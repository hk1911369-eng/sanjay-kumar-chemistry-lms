import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('student concept evidence must match the lesson concept map', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109210000_bind_learning_events_to_lesson_concepts.sql', import.meta.url), 'utf8');
  assert.match(migration, /lesson_id is not null/i);
  assert.match(migration, /join public\.lesson_concepts mapping on mapping\.concept_id = lc\.id/i);
  assert.match(migration, /mapping\.lesson_id = learning_events\.lesson_id/i);
});
