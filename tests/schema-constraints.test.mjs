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


test('desktop portal layout keeps the sidebar scrollable and dashboard grids fluid', async () => {
  const css = await readFile(new URL('../app/responsive.css', import.meta.url), 'utf8');
  assert.ok(css.includes('@media(min-width:761px)'));
  assert.ok(css.includes('grid-template-columns:minmax(220px,258px) minmax(0,1fr)'));
  assert.ok(css.includes('.portal-navigation{\n    min-width:0;\n    min-height:0;\n    overflow-y:auto;'));
  assert.ok(css.includes('grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr))'));
  assert.ok(css.includes('.portal-workspace{'));
  assert.ok(css.includes('overflow-x:clip'));
});


test('manual payment reads do not retain a duplicate permissive policy', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108125442_remove_redundant_manual_payment_select_policy.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('DROP POLICY IF EXISTS "student reads own manual payment"'));
  assert.ok(migration.includes('public.manual_payment_submissions'));
});
 
test('anonymous course browsing does not depend on authenticated role helpers', async () => {
  const roleMigration = await readFile(new URL('../supabase/migrations/20261108130758_scope_course_role_visibility_to_authenticated.sql', import.meta.url), 'utf8');
  const adminMigration = await readFile(new URL('../supabase/migrations/20261108130808_scope_course_admin_policies_to_authenticated.sql', import.meta.url), 'utf8');
  assert.ok(roleMigration.includes('ALTER POLICY "courses visible by role"'));
  assert.ok(roleMigration.includes('TO authenticated'));
  assert.ok(adminMigration.includes('ALTER POLICY "admins manage courses"'));
  assert.ok(adminMigration.includes('TO authenticated'));
});
 
test('anonymous notice reads do not evaluate the admin role helper', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108130902_scope_notice_admin_policy_to_authenticated.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('ALTER POLICY "admins manage notices"'));
  assert.ok(migration.includes('ON public.notices'));
  assert.ok(migration.includes('TO authenticated'));
});
 
test('user and staff row policies are restricted to authenticated sessions', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108131404_scope_user_and_staff_policies_to_authenticated.sql', import.meta.url), 'utf8');
  assert.equal((migration.match(/ TO authenticated;/g) || []).length, 14);
  assert.ok(migration.includes('ALTER POLICY "students read own lesson progress"'));
  assert.ok(migration.includes('ALTER POLICY "profiles own admin or assigned staff read"'));
});
 
test('public course teacher RPC returns names only for published non-archived courses', async () => {
  const migration = await readFile(new URL('../supabase/migrations/0033_public_published_course_access.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('grant select on public.courses to anon'));
  assert.ok(migration.includes('for select'));
  assert.ok(migration.includes('to anon'));
  assert.ok(migration.includes('is_published is true and archived_at is null'));
  assert.ok(migration.includes("p.role::text in ('teacher','staff')"));
  assert.ok(migration.includes('revoke all on function public.get_public_course_teachers(uuid) from public'));
});
 
test('private Storage policies require authentication while course images stay public', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108132143_scope_private_storage_policies_to_authenticated.sql', import.meta.url), 'utf8');
  assert.equal((migration.match(/ TO authenticated;/g) || []).length, 14);
  assert.ok(migration.includes('ALTER POLICY "course members read lesson materials"'));
  assert.ok(migration.includes('ALTER POLICY "students read own payment proofs"'));
  assert.equal(migration.includes('JMT course images public read'), false);
});
