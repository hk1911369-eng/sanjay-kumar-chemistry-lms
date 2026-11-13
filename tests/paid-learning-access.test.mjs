import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('student learning progress and activity writes require current paid access', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109100000_require_paid_learning_access_for_progress_and_events.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('DROP POLICY IF EXISTS "students manage own enrolled lesson progress"'));
  assert.ok(migration.includes('DROP POLICY IF EXISTS "students update own enrolled lesson progress"'));
  assert.ok(migration.includes('DROP POLICY IF EXISTS "students record own learning events"'));
  assert.equal((migration.match(/e\.admission_fee_paid IS TRUE/g) || []).length, 4);
  assert.equal((migration.match(/e\.paid_through >= \(/g) || []).length, 4);
  assert.equal((migration.match(/e\.status = 'active'/g) || []).length, 4);
  assert.ok(migration.includes("date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')"));
  assert.ok(migration.includes('FOR INSERT TO authenticated'));
  assert.ok(migration.includes('FOR UPDATE TO authenticated'));
  assert.ok(migration.includes('WITH CHECK ('));
  assert.ok(migration.includes('USING ('));
  assert.ok(migration.includes("event_type IN ('lesson_viewed','lesson_completed','practice_started')"));
  assert.equal(migration.includes("event_type = 'simulation_completed'"), false);
});
