import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('revision completion requires current paid access before writing learning events', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109130000_require_paid_access_for_revision_completion.sql', import.meta.url), 'utf8');
  assert.match(migration, /create or replace function public\.complete_revision_task\(p_task_id uuid\)/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = pg_catalog, public, pg_temp/i);
  assert.match(migration, /e\.status = 'active'/i);
  assert.match(migration, /e\.admission_fee_paid is true/i);
  assert.match(migration, /e\.paid_through >= v_period_end/i);
  assert.match(migration, /interval '1 month - 1 day'/i);
  assert.match(migration, /insert into public\.learning_events/i);
});
