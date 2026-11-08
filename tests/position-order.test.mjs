import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('lesson and chapter insert ordering is allocated atomically in Postgres', async () => {
  const migration = await read('supabase/migrations/0046_atomic_lesson_chapter_order.sql');
  const actions = await read('app/actions/learning.ts');
  assert.ok(migration.includes('pg_advisory_xact_lock'));
  assert.ok(migration.includes('hashtextextended'));
  assert.ok(migration.includes('max(l.position)'));
  assert.ok(migration.includes('max(c.sort_order)'));
  assert.ok(migration.includes('assign_next_lesson_position'));
  assert.ok(migration.includes('assign_next_chapter_sort_order'));
  assert.equal(actions.includes("select('position')"), false);
  assert.equal(actions.includes("select('sort_order')"), false);
});
