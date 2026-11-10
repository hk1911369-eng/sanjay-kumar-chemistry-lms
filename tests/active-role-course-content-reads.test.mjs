import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readMigration = () => readFile(new URL('../supabase/migrations/20261110272000_require_active_role_for_course_content_reads.sql', import.meta.url), 'utf8');

const policies = [
  ['assignments', 'assignments scoped read'],
  ['chapters', 'chapters visible to enrolled students and assigned teachers'],
  ['lessons', 'lessons visible by enrollment or assignment'],
  ['lesson_resources', 'lesson resources scoped read'],
  ['live_classes', 'live classes scoped read'],
  ['quizzes', 'quizzes scoped read'],
  ['quiz_questions', 'quiz questions scoped read'],
  ['written_exams', 'written exams scoped read'],
  ['written_exam_questions', 'written exam questions scoped read']
];

test('all course-content policies are replaced by active-role-aware versions', async () => {
  const sql = await readMigration();
  for (const [table, name] of policies) {
    assert.ok(sql.includes('DROP POLICY IF EXISTS "' + name + '" ON public.' + table), 'missing policy replacement: ' + table);
    assert.ok(sql.includes('CREATE POLICY "' + name + '"\nON public.' + table), 'missing new policy: ' + table);
  }
  assert.equal((sql.match(/CREATE POLICY /g) || []).length, policies.length);
});

test('student course-content reads require active student role, paid enrollment and non-archived course', async () => {
  const sql = await readMigration();
  for (const [table] of policies) {
    const start = sql.indexOf('ON public.' + table + ' FOR SELECT TO authenticated');
    const end = sql.indexOf('\n);', start);
    assert.notEqual(start, -1, 'missing SELECT policy: ' + table);
    const body = sql.slice(start, end);
    assert.ok(body.includes("(SELECT public.current_role()) = 'student'::public.app_role"), 'missing active student role: ' + table);
    assert.ok(body.includes('e.status = \'active\''), 'missing active enrollment: ' + table);
    assert.ok(body.includes('e.admission_fee_paid IS TRUE'), 'missing paid enrollment: ' + table);
    assert.ok(body.includes('e.paid_through >='), 'missing current billing period: ' + table);
    assert.ok(body.includes('c.archived_at IS NULL'), 'missing non-archived course check: ' + table);
  }
});

test('students cannot read scheduled quiz or written-exam questions before start or after close', async () => {
  const sql = await readMigration();
  const quizStart = sql.indexOf('ON public.quiz_questions FOR SELECT TO authenticated');
  const quizEnd = sql.indexOf('\n);', quizStart);
  const quiz = sql.slice(quizStart, quizEnd);
  assert.ok(quiz.includes('q.starts_at IS NULL OR q.starts_at <= now()'));
  assert.ok(quiz.includes('q.ends_at IS NULL OR q.ends_at >= now()'));

  const examStart = sql.indexOf('ON public.written_exam_questions FOR SELECT TO authenticated');
  const examEnd = sql.indexOf('\n);', examStart);
  const exam = sql.slice(examStart, examEnd);
  assert.ok(exam.includes('x.starts_at IS NULL OR now() >= x.starts_at'));
  assert.ok(exam.includes('x.ends_at IS NULL OR now() <= x.ends_at'));
});

test('admin and assigned teaching staff branches remain available and scoped', async () => {
  const sql = await readMigration();
  for (const [table] of policies) {
    const start = sql.indexOf('ON public.' + table + ' FOR SELECT TO authenticated');
    const end = sql.indexOf('\n);', start);
    const body = sql.slice(start, end);
    assert.ok(body.includes("'admin'::public.app_role"), 'admin branch missing: ' + table);
    if (body.includes("IN ('teacher','staff')")) {
      assert.ok(body.includes('course_assignments'), 'staff course scope missing: ' + table);
      assert.ok(body.includes("(SELECT public.current_role())::text IN ('teacher','staff')"), 'staff active-role guard missing: ' + table);
    }
  }
});

test('migration changes read policies only and does not modify records', async () => {
  const sql = await readMigration();
  assert.doesNotMatch(sql, /\b(INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|TRUNCATE\s+TABLE|DROP\s+TABLE)\b/i);
});
