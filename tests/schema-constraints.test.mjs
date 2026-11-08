import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('database URL and sender phone constraints are represented in migrations', async () => {
  const migration = await readFile(new URL('../supabase/migrations/0048_align_video_and_sender_phone_constraints.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('lessons_video_url_https_check'));
  assert.ok(migration.includes("video_url is null or video_url ~* '^https://'"));
  assert.ok(migration.includes('manual_payment_sender_phone_format'));
  assert.ok(migration.includes("sender_phone is null or sender_phone ~ '^01[3-9][0-9]{8}$'"));
  assert.ok(migration.includes('if not exists'));
});

test('student submission policies require an active student role', async () => {
  const migration = await readFile(new URL('../supabase/migrations/0049_student_submission_role_guards.sql', import.meta.url), 'utf8');
  for (const policy of [
    'students submit own assignments',
    'students update own ungraded submissions',
    'students submit own course applications',
    'students manage own lesson bookmarks',
    'students manage own enrolled lesson progress',
    'students update own enrolled lesson progress',
    'student submits own manual payment',
    'students create own quiz attempts',
    'students submit written exams',
  ]) {
    assert.ok(migration.includes(policy), policy);
  }
  assert.equal(migration.split("public.current_role()) = 'student'").length - 1, 12);
  assert.ok(migration.includes('to authenticated'));
  assert.equal(migration.includes('to public'), false);
});

test('RLS hardening removes the permissive active-account catch-all policy', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108120926_remove_broad_active_account_policies.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes("policyname = 'active accounts only'"));
  assert.ok(migration.includes("schemaname IN ('public', 'storage')"));
  assert.ok(migration.includes('DROP POLICY'));
});

test('SECURITY DEFINER functions use an explicit trusted search path', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108122640_harden_security_definer_search_paths.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('p.prosecdef'));
  assert.ok(migration.includes('pg_catalog.oidvectortypes'));
  assert.ok(migration.includes('search_path TO pg_catalog, public, pg_temp'));
  assert.ok(migration.includes("p.proname <> 'rls_auto_enable'"));
});

test('admin RPC role checks fail closed for a missing active profile', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108123210_fail_closed_admin_rpc_role_guards.sql', import.meta.url), 'utf8');
  for (const fn of [
    'approve_manual_payment_submission',
    'reject_manual_payment_submission',
    'set_course_archived',
    'set_student_account_active',
  ]) {
    assert.ok(migration.includes(fn), fn);
  }
  assert.ok(migration.includes('IS DISTINCT FROM'));
});

test('application rate limits require an active account profile', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108123730_require_active_profile_for_app_rate_limits.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('consume_app_rate_limit'));
  assert.ok(migration.includes('public.current_role() is null'));
  assert.ok(migration.includes('Active account required'));
});
