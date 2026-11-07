import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('catalogue migration seeds exactly the three authorized ৳700 courses', async () => {
  const sql = await read('supabase/migrations/0003_hsc_admission_configuration.sql');
  const guard = await read('supabase/migrations/0005_auth_roles_and_course_guardrails.sql');
  assert.match(sql, /HSC 2027 Chemistry/);
  assert.match(sql, /HSC 2028 Chemistry/);
  assert.match(sql, /Admission Chemistry/);
  assert.match(sql, /700, false/);
  assert.match(guard, /new\.price_bdt <> 700/);
  assert.match(guard, /hsc-2027-chemistry.*hsc-2028-chemistry.*admission-chemistry/s);
});

test('payment submission is student-owned and review is admin-only through RPC', async () => {
  const action = await read('app/actions/payments.ts');
  const sql = await read('supabase/migrations/0004_secure_manual_payment_workflow.sql');
  assert.match(action, /auth\.getUser\(\)/);
  assert.match(action, /profile\?\.role !== 'admin'/);
  assert.match(action, /approve_manual_payment_submission/);
  assert.match(action, /reject_manual_payment_submission/);
  assert.match(sql, /for update/i);
  assert.match(sql, /public\.current_role\(\) <> 'admin'/);
  assert.match(sql, /insert into public\.enrollments/i);
  assert.match(sql, /insert into public\.audit_logs/i);
});

test('teacher learning access is assignment-scoped and progress is student-scoped', async () => {
  const sql = await read('supabase/migrations/0007_learning_content_and_teacher_scope.sql');
  assert.match(sql, /course_assignments/);
  assert.match(sql, /assigned teachers and admins manage lessons/);
  assert.match(sql, /student_id = auth\.uid\(\)/);
  assert.match(sql, /admins manage lesson progress/);
  assert.match(sql, /students read own enrollments and admins read all/);
  assert.match(sql, /sender_phone is null/);
  assert.match(sql, /validate_lesson_chapter_course/);
  assert.match(sql, /before insert or update on public\.courses/i);
});

test('no browser source includes a service-role secret reference', async () => {
  const files = ['app/page.tsx','app/student/page.tsx','app/admin/page.tsx','app/teacher/page.tsx','app/actions/auth.ts','app/actions/payments.ts','app/actions/learning.ts'];
  for (const file of files) assert.doesNotMatch(await read(file), /SUPABASE_SERVICE_ROLE_KEY/);
});

test('manual payments do not report automatic wallet verification', async () => {
  const action = await read('app/actions/payments.ts');
  const api = await read('app/api/payments/create/route.ts');
  assert.match(action, /pending_review/);
  assert.match(api, /410/);
});


test('email confirmation redirects are restricted to the same origin', async () => {
  const route = await read('app/auth/confirm/route.ts');
  assert.match(route, /new URL\(next, request\.url\)/);
  assert.match(route, /target\.origin === request\.nextUrl\.origin/);
  assert.doesNotMatch(route, /next\.startsWith\('\/'\).*next\.startsWith\('\/\/'\)/);
});

test('learning page selects the chapter id before rendering chapter labels', async () => {
  const page = await read('app/learn/[courseId]/page.tsx');
  assert.match(page, /select\('[^']*chapter_id[^']*'\)/);
  assert.match(page, /l\.chapter_id/);
});

test('lesson discussion identity and pin privileges are enforced in the database', async () => {
  const migration = await read('supabase/migrations/0021_secure_discussions_and_rate_limits.sql');
  const action = await read('app/actions/learning.ts');
  const page = await read('app/learn/[courseId]/page.tsx');
  assert.match(migration, /new\.author_name := coalesce\(v_name, 'Member'\)/);
  assert.match(migration, /Only assigned teachers and admins can pin discussions/);
  assert.match(migration, /Discussion identity and location fields cannot be changed/);
  assert.match(migration, /authors and assigned teachers update discussion body or pin/);
  assert.match(action, /consume_app_rate_limit.*lesson_discussion/s);
  assert.match(action, /pinLessonDiscussion/);
  assert.match(page, /Teacher/);
  assert.match(page, /Pin comment/);
});

test('manual payment submission is throttled by authenticated user', async () => {
  const migration = await read('supabase/migrations/0021_secure_discussions_and_rate_limits.sql');
  const action = await read('app/actions/payments.ts');
  assert.match(migration, /manual_payment/);
  assert.match(migration, /interval '15 minutes'/);
  assert.match(action, /consume_app_rate_limit.*manual_payment/s);
});
