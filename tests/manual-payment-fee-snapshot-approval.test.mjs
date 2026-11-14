import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('pending initial payments are approved against the submitted fee snapshot', async () => {
  const migration = await read('supabase/migrations/20261114150000_honor_manual_payment_fee_snapshots.sql');
  const fn = migration.slice(migration.indexOf('create or replace function public.guard_manual_payment_approval'));
  assert.match(fn, /new\.amount_bdt <> new\.fee_monthly_bdt \+ new\.fee_admission_bdt/);
  assert.match(fn, /An accepted application for this delivery mode is required/);
  assert.doesNotMatch(fn, /course_row\.(live_price_bdt|recorded_price_bdt|offline_price_bdt)/);
});

test('monthly payment approval uses the enrolled fee snapshot, not the current catalogue price', async () => {
  const migration = await read('supabase/migrations/20261114150000_honor_manual_payment_fee_snapshots.sql');
  const fn = migration.slice(migration.indexOf('create or replace function public.guard_manual_payment_approval'));
  assert.match(fn, /enrollment_row\.monthly_fee_bdt/);
  assert.match(fn, /new\.fee_monthly_bdt/);
  assert.match(fn, /An active enrollment with the same learning format is required/);
  assert.match(fn, /new\.amount_bdt <> new\.fee_monthly_bdt/);
});

test('approval still blocks unpublished courses and future billing periods', async () => {
  const migration = await read('supabase/migrations/20261114150000_honor_manual_payment_fee_snapshots.sql');
  const fn = migration.slice(migration.indexOf('create or replace function public.guard_manual_payment_approval'));
  assert.match(fn, /new\.billing_period > current_period/);
  assert.match(fn, /course_row\.is_published is not true/);
  assert.match(fn, /course_row\.archived_at is not null/);
  assert.match(fn, /new\.delivery_mode = any\(course_row\.delivery_modes\)/);
  assert.doesNotMatch(fn, /course_row\.(live_price_bdt|recorded_price_bdt|offline_price_bdt|admission_fee_bdt)/);
});
