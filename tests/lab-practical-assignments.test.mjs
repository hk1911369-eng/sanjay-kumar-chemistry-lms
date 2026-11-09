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

test('student practical delivery requires a currently published experiment and one notebook per assignment', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110230000_tighten_practical_assignment_delivery.sql', import.meta.url), 'utf8');
  assert.match(migration, /vl\.is_published is true/i);
  assert.match(migration, /e\.admission_fee_paid is true/i);
  assert.match(migration, /e\.paid_through >=/i);
  assert.match(migration, /create unique index if not exists lab_notebook_one_per_student_assignment_idx/i);
  assert.match(migration, /on public\.lab_notebook_entries\(student_id, assignment_id\)/i);
});


test('archiving an assignment blocks new notebook links but preserves existing notebook edits and submissions', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110249000_preserve_existing_practical_work_after_archival.sql', import.meta.url), 'utf8');
  assert.match(migration, /if tg_op = 'UPDATE' then[\s\S]*new\.assignment_id is distinct from old\.assignment_id[\s\S]*return new/i);
  assert.match(migration, /if new\.assignment_id is not null and not exists/i);
  assert.match(migration, /a\.status = 'published'/i);
  assert.match(migration, /revoke all on function public\.guard_lab_notebook_assignment_link\(\) from public, anon, authenticated/i);
});

test('teacher review queue identifies late work from server-stored due and submission timestamps without auto-deducting marks', async () => {
  const page = await readFile(new URL('../app/teacher/lab-notebooks/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /assignment_dueRows|assignmentDueRows/);
  assert.match(page, /new Date\(entry\.submitted_at\)\.getTime\(\)>new Date\(due\)\.getTime\(\)/);
  assert.match(page, /Late submission/);
  assert.match(page, /No automatic mark deduction is applied/);
  assert.match(page, /review\.submitted_at/);
});
