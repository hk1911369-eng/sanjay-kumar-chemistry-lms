import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = '../supabase/migrations/20261110271000_require_active_role_for_personal_record_reads.sql';
const readMigration = () => readFile(new URL(migrationPath, import.meta.url), 'utf8');

const policies = [
  ['assignment_submissions', 'assignment submissions scoped read'],
  ['course_applications', 'students read own course applications'],
  ['enrollments', 'students read own enrollments'],
  ['learner_concept_mastery', 'students admins and subject-assigned staff read concept mastery'],
  ['learner_exam_targets', 'students and admins read exam targets'],
  ['learner_mistake_memory', 'students and assigned staff read mistake memory'],
  ['learner_profiles', 'students and admins read learner profiles'],
  ['learning_events', 'students and assigned staff read learning events'],
  ['lesson_progress', 'students read own lesson progress'],
  ['manual_payment_submissions', 'admins read all manual payment submissions'],
  ['payment_orders', 'students read own payment orders and admins read all'],
  ['quiz_attempts', 'quiz attempts scoped read'],
  ['revision_tasks', 'students and assigned staff read revision tasks'],
  ['student_attendance', 'attendance scoped read'],
  ['student_followups', 'student followups scoped read'],
  ['student_practice_attempts', 'students and assigned staff read practice attempts'],
  ['written_exam_submissions', 'written submissions scoped read']
];

function policyBody(sql, table) {
  const start = sql.indexOf('ON public.' + table + ' FOR SELECT TO authenticated');
  assert.notEqual(start, -1, 'missing SELECT policy for ' + table);
  const end = sql.indexOf('\n);', start);
  assert.notEqual(end, -1, 'unterminated SELECT policy for ' + table);
  return sql.slice(start, end);
}

test('all personal-record SELECT policies replace the original policy names', async () => {
  const sql = await readMigration();
  for (const [table, name] of policies) {
    assert.ok(sql.includes('DROP POLICY IF EXISTS "' + name + '" ON public.' + table), 'missing replacement for ' + table);
    assert.match(policyBody(sql, table), /FOR SELECT TO authenticated/);
  }
  assert.equal((sql.match(/CREATE POLICY /g) || []).length, policies.length);
  assert.equal((sql.match(/FOR SELECT TO authenticated/g) || []).length, policies.length);
});

test('every self-access branch requires the active student role', async () => {
  const sql = await readMigration();
  for (const [table] of policies) {
    if (table === 'enrollments') {
      assert.match(policyBody(sql, table), /student_id = \(SELECT auth\.uid\(\)\) AND \(SELECT public\.current_role\(\)\) = 'student'::public\.app_role/);
    } else {
      assert.match(
        policyBody(sql, table),
        /student_id = \(SELECT auth\.uid\(\)\)[\s\S]{0,180}\(SELECT public\.current_role\(\)\) = 'student'::public\.app_role/,
        'self-read is not guarded by current_role() for ' + table
      );
    }
  }
});

test('assigned-staff branches require active teaching roles and course assignment scope', async () => {
  const sql = await readMigration();
  for (const [table] of policies) {
    const body = policyBody(sql, table);
    if (body.includes("IN ('teacher','staff')")) {
      assert.ok(body.includes("current_role())::text IN ('teacher','staff')"), 'missing active staff guard for ' + table);
      assert.ok(body.includes('course_assignments'), 'missing course scope for ' + table);
    }
  }
  assert.ok(policyBody(sql, 'quiz_attempts').includes("current_role())::text IN ('teacher','staff')"));
});

test('administrator enrollment access is preserved and migration does not mutate records', async () => {
  const sql = await readMigration();
  assert.doesNotMatch(sql, /DROP POLICY IF EXISTS "admins manage enrollments"/i);
  assert.doesNotMatch(sql, /\b(INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|TRUNCATE\s+TABLE|DROP\s+TABLE)\b/i);
});
