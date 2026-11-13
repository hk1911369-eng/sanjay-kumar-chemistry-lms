import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('every practical review round is captured in an append-only history table', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110240000_add_lab_notebook_review_history.sql', import.meta.url), 'utf8');
  assert.match(migration, /create table if not exists public\.lab_notebook_review_history/i);
  assert.match(migration, /unique \(notebook_id, review_round\)/i);
  assert.match(migration, /decision in \('returned','reviewed'\)/i);
  assert.match(migration, /alter table public\.lab_notebook_review_history enable row level security/i);
  assert.match(migration, /grant select on public\.lab_notebook_review_history to authenticated/i);
  assert.match(migration, /revoke all on public\.lab_notebook_review_history from public, anon, authenticated/i);
  assert.match(migration, /after update of status on public\.lab_notebook_entries/i);
  assert.match(migration, /old\.status = 'submitted' and new\.status in \('returned','reviewed'\)/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /pg_catalog\.now\(\)/i);
});

test('review history snapshots reviewer display names without opening staff profiles to students', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110241000_snapshot_lab_notebook_reviewer_name.sql', import.meta.url), 'utf8');
  assert.match(migration, /reviewer_display_name text not null/i);
  assert.match(migration, /from public\.profiles p/i);
  assert.match(migration, /where p\.id = new\.reviewed_by/i);
  assert.match(migration, /revoke all on function public\.record_lab_notebook_review_history\(\) from public, anon, authenticated/i);
});

test('student and teaching workspaces display review history through role-scoped queries', async () => {
  const [student, teacher] = await Promise.all([
    readFile(new URL('../app/student/lab-notebook/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/teacher/lab-notebooks/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(student, /from\('lab_notebook_review_history'\)/);
  assert.match(student, /Teacher review history/);
  assert.match(student, /review\.reviewer_display_name/);
  assert.match(teacher, /from\('lab_notebook_review_history'\)/);
  assert.match(teacher, /Recent review history/);
  assert.match(teacher, /review\.reviewer_display_name/);
});
