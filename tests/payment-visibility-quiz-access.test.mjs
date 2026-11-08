import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('payment calendars and fee details are admin-only in the student management page and RPC', async () => {
  const page = await read('app/students/manage/page.tsx');
  const migration = await read('supabase/migrations/0030_admin_payment_calendar_and_paid_quiz_access.sql');
  assert.match(page, /const paymentCalendars = role === 'admin' \?/);
  assert.match(page, /\{role === 'admin' && <>[\s\S]*Courses & monthly payment calendar/);
  assert.match(page, /\{role !== 'admin' && <>[\s\S]*Enrolled courses/);
  assert.match(migration, /public\.current_role\(\) is distinct from 'admin'/);
  assert.match(migration, /Only admins can view payment calendars/);
  assert.match(migration, /revoke all on function public\.get_student_payment_calendar\(uuid\) from public, anon/i);
});

test('quiz submission rechecks student role and current paid enrollment inside the SECURITY DEFINER RPC', async () => {
  const migration = await read('supabase/migrations/0030_admin_payment_calendar_and_paid_quiz_access.sql');
  assert.match(migration, /public\.current_role\(\) is distinct from 'student'/);
  assert.match(migration, /e\.admission_fee_paid is true/);
  assert.match(migration, /e\.paid_through >=/);
  assert.match(migration, /Asia\/Dhaka/);
  assert.match(migration, /for update/i);
  assert.match(migration, /quiz_answer_keys/);
  assert.match(migration, /set answers = p_answers,[\s\S]*score = v_score/);
});
