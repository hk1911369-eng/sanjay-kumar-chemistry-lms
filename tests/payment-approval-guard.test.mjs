import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('payment approval cannot grant future billing periods or accept forged delivery-mode fee snapshots', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109150000_guard_payment_approval_period_and_fees.sql', import.meta.url), 'utf8');
  assert.match(migration, /create or replace function public\.guard_manual_payment_approval\(\)/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = pg_catalog, public, pg_temp/i);
  assert.match(migration, /new\.billing_period > current_period/i);
  assert.match(migration, /new\.delivery_mode = any\(course_row\.delivery_modes\)/i);
  assert.match(migration, /new\.payment_kind = 'monthly'/i);
  assert.match(migration, /coalesce\(e\.monthly_fee_bdt, expected_monthly\)/i);
  assert.match(migration, /new\.fee_monthly_bdt is distinct from expected_monthly/i);
  assert.match(migration, /new\.fee_admission_bdt is distinct from expected_admission/i);
  assert.match(migration, /new\.amount_bdt <> expected_monthly \+ expected_admission/i);
  assert.match(migration, /ca\.status = 'accepted'/i);
  assert.match(migration, /before update of status on public\.manual_payment_submissions/i);
});
