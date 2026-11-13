import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('assignment and written-exam submission timestamps cannot be future-dated by clients', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109180000_bound_assessment_submission_timestamps.sql', import.meta.url), 'utf8');
  assert.equal((migration.match(/submitted_at <= now\(\) \+ interval '30 seconds'/gi) ?? []).length, 2);
  assert.match(migration, /students submit own assignments/i);
  assert.match(migration, /students submit written exams/i);
  assert.match(migration, /x\.starts_at is null or now\(\) >= x\.starts_at/i);
  assert.match(migration, /x\.ends_at is null or now\(\) <= x\.ends_at/i);
});
