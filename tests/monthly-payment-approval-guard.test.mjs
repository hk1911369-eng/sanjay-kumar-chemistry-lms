import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('monthly payment approval rechecks active enrollment and paid admission', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113250000_recheck_admission_paid_at_payment_approval.sql', import.meta.url), 'utf8');
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.guard_monthly_payment_admission_paid/i);
  assert.match(migration, /NEW\.status IS DISTINCT FROM 'approved'/i);
  assert.match(migration, /NEW\.payment_kind IS DISTINCT FROM 'monthly'/i);
  assert.match(migration, /FROM public\.enrollments e[\s\S]*e\.student_id = NEW\.student_id[\s\S]*e\.course_id = NEW\.course_id[\s\S]*FOR UPDATE/i);
  assert.match(migration, /enrollment_row\.status IS DISTINCT FROM 'active'/i);
  assert.match(migration, /enrollment_row\.admission_fee_paid IS DISTINCT FROM TRUE/i);
  assert.match(migration, /enrollment_row\.delivery_mode IS DISTINCT FROM NEW\.delivery_mode/i);
  assert.match(migration, /CREATE TRIGGER guard_monthly_payment_admission_paid[\s\S]*BEFORE UPDATE OF status ON public\.manual_payment_submissions/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.guard_monthly_payment_admission_paid\(\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i);
});
