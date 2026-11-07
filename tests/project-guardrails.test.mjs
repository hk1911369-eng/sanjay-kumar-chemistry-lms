import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('courses are created only by admins and are not seeded by new feature migrations', async () => {
  const action = await read('app/actions/course-studio.ts');
  const migrations = [
    'supabase/migrations/0015_jmt_academy_course_studio.sql',
    'supabase/migrations/0016_course_applications.sql',
    'supabase/migrations/0021_secure_discussions_and_rate_limits.sql',
  ];
  assert.match(action, /me\?\.role!=='admin'/);
  assert.match(action, /HSC 2027/);
  assert.match(action, /HSC 2028/);
  assert.match(action, /Admission Batch/);
  for (const path of migrations) {
    const sql = await read(path);
    assert.doesNotMatch(sql, /insert\s+into\s+public\.courses/i);
  }
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

test('authentication attempts are throttled before Supabase Auth calls', async () => {
  const action = await read('app/actions/auth.ts');
  const limiter = await read('lib/auth-rate-limit.ts');
  const migration = await read('supabase/migrations/0021_secure_discussions_and_rate_limits.sql');
  assert.match(action, /enforceAuthRateLimit\('sign_in'/);
  assert.match(action, /enforceAuthRateLimit\('sign_up'/);
  assert.match(limiter, /supabaseAdmin\(\)/);
  assert.match(migration, /consume_auth_rate_limit/);
  assert.match(migration, /grant execute on function public\.consume_auth_rate_limit.*service_role/i);
});

test('lesson file signed URLs are created only after an explicit resource request', async () => {
  const page = await read('app/learn/[courseId]/page.tsx');
  const action = await read('app/actions/learning.ts');
  const component = await read('components/lesson-resource-access.tsx');
  assert.doesNotMatch(page, /createSignedUrl/);
  assert.match(action, /createSignedUrl\([\s\S]*?, 300/);
  assert.match(component, /getLessonResourceUrl/);
  assert.match(component, /onClick=\{\(\) => open\('preview'\)\}/);
});

test('authentication throttling uses the visitor IP rather than a proxy IP', async () => {
  const limiter = await read('lib/auth-rate-limit.ts');
  assert.match(limiter, /get\('cf-connecting-ip'\)/);
  assert.match(limiter, /filter\(Boolean\)\[0\]/);
  assert.doesNotMatch(limiter, /filter\(Boolean\)\.at\(-1\)/);
});
