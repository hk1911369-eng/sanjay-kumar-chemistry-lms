import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('lesson completion is one atomic, authenticated, paid-access database transition', async () => {
  const migration = await read('supabase/migrations/20261109200000_harden_lesson_progress_integrity.sql');
  const atomicMigration = await read('supabase/migrations/20261110140000_atomic_lesson_completion_rpc.sql');
  const action = await read('app/actions/learning.ts');
  assert.match(migration, /completed is not true/i);
  assert.match(migration, /completed_at >= now\(\) - interval '10 minutes'/i);
  assert.match(migration, /completed_at <= now\(\) \+ interval '30 seconds'/i);
  assert.match(migration, /revoke insert, update on table public\.lesson_progress from authenticated/i);
  assert.match(migration, /grant update \(completed, completed_at, updated_at\)/i);
  assert.match(atomicMigration, /security definer/i);
  assert.match(atomicMigration, /auth\.uid\(\)/i);
  assert.match(atomicMigration, /admission_fee_paid is true/i);
  assert.match(atomicMigration, /paid_through >= v_month_end/i);
  assert.match(atomicMigration, /insert into public\.lesson_progress/i);
  assert.match(atomicMigration, /insert into public\.learning_events/i);
  assert.match(action, /rpc\('record_lesson_completion'/);
  assert.doesNotMatch(action, /from\('lesson_progress'\)\.(insert|update)/);
  assert.doesNotMatch(action, /from\('learning_events'\)\.insert/);
});
