import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('payment approval rechecks that the target student profile is active', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261113180000_require_active_student_for_payment_approval.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.guard_active_student_payment_approval\(\)/i);
  assert.match(sql, /NEW\.status IS DISTINCT FROM 'approved'/i);
  assert.match(sql, /p\.id = NEW\.student_id[\s\S]*p\.role::text = 'student'[\s\S]*p\.is_active IS TRUE/i);
  assert.match(sql, /BEFORE UPDATE OF status ON public\.manual_payment_submissions/i);
  assert.match(sql, /USING ERRCODE = '42501'/i);
});

test('payment approval guard does not alter enrollment or payment records itself', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261113180000_require_active_student_for_payment_approval.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(sql, /\b(INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|TRUNCATE\s+TABLE|DROP\s+TABLE)\b/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.guard_active_student_payment_approval\(\)[\s\S]*FROM PUBLIC, anon, authenticated/i);
});
