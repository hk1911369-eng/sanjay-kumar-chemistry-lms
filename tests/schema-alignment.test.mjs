import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('removes legacy fixed-price chemistry-only course guard', async () => {
  const migration = await read('supabase/migrations/0041_align_course_guards_and_application_notifications.sql');
  assert.match(migration, /drop trigger if exists enforce_supported_course_catalogue/i);
  assert.match(migration, /drop function if exists public\.enforce_supported_chemistry_courses/i);
  assert.doesNotMatch(migration, /NEW\.price_bdt <> 700/i);
});

test('adds secure student notification when course application status changes', async () => {
  const migration = await read('supabase/migrations/0041_align_course_guards_and_application_notifications.sql');
  assert.match(migration, /create schema if not exists jmt_private/i);
  assert.match(migration, /security definer\s+set search_path = ''/i);
  assert.match(migration, /after update of status on public\.course_applications/i);
  assert.match(migration, /insert into public\.notifications/i);
  assert.match(migration, /revoke all on function jmt_private\.notify_course_application_status/i);
});

test('preserves automatic RLS protection for future public tables', async () => {
  const migration = await read('supabase/migrations/0041_align_course_guards_and_application_notifications.sql');
  assert.match(migration, /create or replace function public\.rls_auto_enable/i);
  assert.match(migration, /create event trigger ensure_rls/i);
  assert.match(migration, /alter table if exists %I\.%I enable row level security/i);
});
