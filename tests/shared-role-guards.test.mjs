import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('shared role guard checks active profile and assigned course access', async () => {
  const helper = await read('lib/auth/require-role.ts');
  assert.ok(helper.includes("select('role,is_active')"));
  assert.ok(helper.includes("profile.is_active !== true"));
  assert.ok(helper.includes("redirect('/account-disabled')"));
  assert.ok(helper.includes('requireCourseStaff'));
  assert.ok(helper.includes("eq('teacher_id', actor.user.id)"));
});

test('sensitive server actions use shared active-role guards', async () => {
  const course = await read('app/actions/course-studio.ts');
  const students = await read('app/actions/student-management.ts');
  const payments = await read('app/actions/payments.ts');
  const learning = await read('app/actions/learning.ts');
  assert.ok(course.includes('requireAdmin'));
  assert.ok(students.includes("requireRole(['admin'])"));
  assert.ok(students.includes("requireRole(['student'])"));
  assert.ok(students.includes("requireRole(['admin','teacher','staff'])"));
  assert.ok(payments.includes("requireRole(['student'])"));
  assert.ok(payments.includes("requireRole(['admin'])"));
  assert.ok(learning.includes('requireCourseStaff'));
  assert.ok(learning.includes('requireAdmin'));
  const studentPolicies = await read('supabase/migrations/0049_student_submission_role_guards.sql');
  for (const table of ['assignment_submissions','course_applications','lesson_bookmarks','lesson_progress','manual_payment_submissions','quiz_attempts','written_exam_submissions']) {
    assert.ok(studentPolicies.includes('public.' + table), table);
  }
  assert.ok(studentPolicies.includes("'student'::public.app_role"));
});
