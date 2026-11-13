import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('lab notebook migration scopes student writing to paid published subject labs', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261110180000_add_lab_notebook_practical_assessment.sql', import.meta.url), 'utf8');
  assert.match(sql, /alter table public\.lab_notebook_entries enable row level security/i);
  assert.match(sql, /e\.admission_fee_paid is true/i);
  assert.match(sql, /e\.paid_through >=/i);
  assert.match(sql, /vl\.is_published is true/i);
  assert.match(sql, /cs\.course_id = lab_notebook_entries\.course_id/i);
  assert.match(sql, /c\.archived_at is null/i);
  assert.match(sql, /course_assignments ca/i);
});

test('lab notebook writes protect review fields and submitted scientific records', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261110180000_add_lab_notebook_practical_assessment.sql', import.meta.url), 'utf8');
  assert.match(sql, /guard_lab_notebook_entry_write/i);
  assert.match(sql, /new\.score is distinct from old\.score/i);
  assert.match(sql, /new\.measurements is distinct from old\.measurements/i);
  assert.match(sql, /new\.status not in \('draft','submitted'\)/i);
  assert.match(sql, /new\.status not in \('returned','reviewed'\)/i);
  assert.match(sql, /length\(new\.teacher_feedback\) > 4000/i);
  assert.match(sql, /revoke delete on public\.lab_notebook_entries from authenticated/i);
});
