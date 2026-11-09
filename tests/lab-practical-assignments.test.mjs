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


test('the practical assignment mark total matches the fixed six-part rubric', async () => {
  const [migration, action, page, rubric] = await Promise.all([
    readFile(new URL('../supabase/migrations/20261110250000_align_practical_assignment_rubric_and_archival.sql', import.meta.url), 'utf8'),
    readFile(new URL('../app/actions/lab-practical-assignments.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/teacher/lab-notebooks/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20261110242000_add_weighted_lab_practical_rubric.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /check \(points = 100\)/i);
  assert.match(action, /const points = 100/);
  assert.doesNotMatch(action, /formData\.get\('points'\)/);
  assert.doesNotMatch(page, /name="points"/);
  assert.match(page, /Assessment total: 100 marks/);
  assert.match(rubric, /array\[15,20,25,20,15,5\]/i);
});

test('assignment archiving is scoped, idempotent and preserves started notebooks', async () => {
  const [action, page, timestampMigration] = await Promise.all([
    readFile(new URL('../app/actions/lab-practical-assignments.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/teacher/lab-notebooks/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20261110251000_fix_practical_assignment_publication_timestamp_integrity.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(action, /export async function archiveLabPracticalAssignment/);
  assert.match(action, /\.update\(\{ status: 'archived', published_at: null \}\)/);
  assert.match(action, /\.eq\('status', 'published'\)/);
  assert.match(page, /archiveLabPracticalAssignment/);
  assert.match(page, /Archiving stops new notebooks\. Existing student notebooks remain editable and reviewable\./);
  assert.match(timestampMigration, /old\.status = 'published'[\s\S]*old\.published_at/);
  assert.match(timestampMigration, /new\.published_at := pg_catalog\.now\(\)/);
});


test('assignment creation and updates preserve server-authored publication timestamps and fixed rubric marks', async () => {
  const [migration, followup] = await Promise.all([
    readFile(new URL('../supabase/migrations/20261110250000_align_practical_assignment_rubric_and_archival.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20261110251000_fix_practical_assignment_publication_timestamp_integrity.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /check \(points = 100\)/i);
  assert.match(followup, /new\.published_at := case when new\.status = 'published' then pg_catalog\.now\(\) else null end/i);
  assert.match(followup, /new\.published_at := old\.published_at/i);
  assert.match(followup, /new\.published_at := pg_catalog\.now\(\)/i);
  assert.match(followup, /new\.points <> 100/i);
});

test('task instructions and due dates become immutable after a learner starts, while archival remains available', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110252000_freeze_practical_task_terms_after_start.sql', import.meta.url), 'utf8');
  assert.match(migration, /new\.title is distinct from old\.title/i);
  assert.match(migration, /new\.instructions is distinct from old\.instructions/i);
  assert.match(migration, /new\.due_at is distinct from old\.due_at/i);
  assert.match(migration, /from public\.lab_notebook_entries n[\s\S]*where n\.assignment_id = old\.id/i);
  assert.match(migration, /Practical task terms cannot change after a learner starts a notebook/i);
  assert.match(migration, /new\.status = 'published'[\s\S]*old\.status = 'published'[\s\S]*old\.published_at/i);
  assert.match(migration, /else[\s\S]*new\.published_at := null/i);
});
