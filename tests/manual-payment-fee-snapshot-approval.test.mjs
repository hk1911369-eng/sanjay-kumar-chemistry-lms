import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

const loadGuard = async () => {
  const migration = await read('supabase/migrations/20261114150000_honor_manual_payment_fee_snapshots.sql');
  return migration.slice(migration.indexOf('create or replace function public.guard_manual_payment_approval'));
};

test('pending initial payments are approved against the submitted fee snapshot', async () => {
  const fn = await loadGuard();
  for (const guard of [
    'new.amount_bdt <> new.fee_monthly_bdt + new.fee_admission_bdt',
    'An accepted application for this delivery mode is required',
  ]) assert.ok(fn.includes(guard), 'initial-payment guard missing: ' + guard);
  assert.equal(/course_row\.(live_price_bdt|recorded_price_bdt|offline_price_bdt)/.test(fn), false);
});

test('monthly payment approval uses the enrolled fee snapshot, not the current catalogue price', async () => {
  const fn = await loadGuard();
  for (const guard of [
    'enrollment_row.monthly_fee_bdt',
    'new.fee_monthly_bdt',
    'An active enrollment with the same learning format is required',
    'new.amount_bdt <> new.fee_monthly_bdt',
    'e.delivery_mode = new.delivery_mode',
  ]) assert.ok(fn.includes(guard), 'monthly-payment guard missing: ' + guard);
});

test('approval still blocks unpublished courses, disabled formats and future billing periods', async () => {
  const fn = await loadGuard();
  for (const guard of [
    'new.billing_period > current_period',
    'course_row.is_published is not true',
    'course_row.archived_at is not null',
    'new.delivery_mode = any(course_row.delivery_modes)',
  ]) assert.ok(fn.includes(guard), 'approval guard missing: ' + guard);
  assert.equal(/course_row\.(live_price_bdt|recorded_price_bdt|offline_price_bdt|admission_fee_bdt)/.test(fn), false);
});

test('legacy submissions without delivery-mode snapshots retain the legacy approval path', async () => {
  const fn = await loadGuard();
  const legacy = fn.slice(fn.indexOf('if new.delivery_mode is null then'));
  assert.ok(legacy.includes('Delivery-mode fee snapshots require a delivery mode'));
  assert.ok(legacy.indexOf('return new;') > legacy.indexOf('Delivery-mode fee snapshots require a delivery mode'));
});

test('the trigger only adds approval guards on transition to approved', async () => {
  const fn = await loadGuard();
  for (const guard of [
    "new.status is distinct from 'approved'::public.manual_payment_review_status",
    "old.status = 'approved'::public.manual_payment_review_status",
    'for update',
    'security definer',
    'set search_path = pg_catalog, public, pg_temp',
  ]) assert.ok(fn.includes(guard), 'trigger guard missing: ' + guard);
});
