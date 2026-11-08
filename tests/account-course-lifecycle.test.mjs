import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('student deactivation is reversible, audited and enforced at database level', async () => {
  const migration = await read('supabase/migrations/0047_course_archive_student_deactivation.sql');
  const middleware = await read('lib/supabase/middleware.ts');
  const disabled = await read('app/account-disabled/page.tsx');
  const management = await read('app/students/manage/page.tsx');
  assert.ok(migration.includes('is_active boolean not null default true'));
  assert.ok(migration.includes('p_student_id'));
  assert.ok(migration.includes('student_account_deactivated'));
  assert.ok(migration.includes('student_account_reactivated'));
  assert.ok(migration.includes('active accounts only'));
  assert.ok(migration.includes('as restrictive for all to authenticated'));
  assert.ok(migration.includes('p.is_active is true'));
  assert.ok(middleware.includes("select('is_active')"));
  assert.ok(middleware.includes('/account-disabled'));
  assert.ok(disabled.includes('Your enrolment, payment and academic history have not been deleted'));
  assert.ok(management.includes('setStudentAccountActive'));
  assert.ok(management.includes('Reactivate student account'));
});

test('course archive hides and disables new enrolment without deleting records', async () => {
  const migration = await read('supabase/migrations/0047_course_archive_student_deactivation.sql');
  const action = await read('app/actions/course-studio.ts');
  const page = await read('app/admin/courses/page.tsx');
  assert.ok(migration.includes('set_course_archived'));
  assert.ok(migration.includes("is_published = case when p_archived then false"));
  assert.ok(migration.includes("enrollment_open = case when p_archived then false"));
  assert.ok(migration.includes('course_archived'));
  assert.ok(migration.includes('course_restored'));
  assert.ok(action.includes("rpc('set_course_archived'"));
  assert.ok(page.includes('archivedCourses'));
  assert.ok(page.includes('Restore course'));
  assert.ok(page.includes('Archive course'));
  assert.equal(action.includes(".delete()"), false);
});
