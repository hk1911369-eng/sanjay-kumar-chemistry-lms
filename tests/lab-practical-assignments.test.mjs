import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('teacher practical assignments are paid-course scoped and RLS protected', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110220000_add_teacher_assigned_lab_practicals.sql', import.meta.url), 'utf8');
  assert.match(migration, /create table if not exists public\.lab_practical_assignments/i);
  assert.match(migration, /alter table public\.lab_practical_assignments enable row level security/i);
  assert.match(migration, /e\.admission_fee_paid is true/i);
  assert.match(migration, /e\.paid_through >=/i);
  assert.match(migration, /e\.status = 'active'/i);
  assert.match(migration, /ca\.teacher_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /vl\.is_published is true/i);
  assert.match(migration, /status = 'published'/i);
});

test('practical notebook assignment links cannot be moved or mismatched', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110220000_add_teacher_assigned_lab_practicals.sql', import.meta.url), 'utf8');
  assert.match(migration, /new\.assignment_id is distinct from old\.assignment_id/i);
  assert.match(migration, /a\.course_id = new\.course_id/i);
  assert.match(migration, /a\.lab_id = new\.lab_id/i);
  assert.match(migration, /a\.status = 'published'/i);
  assert.match(migration, /set search_path = pg_catalog, public, pg_temp/i);
});
