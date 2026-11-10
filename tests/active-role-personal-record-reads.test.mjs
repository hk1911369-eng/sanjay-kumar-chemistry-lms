import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('personal record SELECT policies require the matching active student role for self-access', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261110269000_require_active_role_for_personal_record_reads.sql', import.meta.url), 'utf8');
  const expected = [
    'assignment submissions scoped read',
    'students read own course applications',
    'students read own enrollments',
    'students admins and subject-assigned staff read concept mastery',
    'students and admins read exam targets',
    'students and assigned staff read mistake memory',
    'students and admins read learner profiles',
    'students and assigned staff read learning events',
    'students read own lesson progress',
    'admins read all manual payment submissions',
    'students read own payment orders and admins read all',
    'quiz attempts scoped read',
    'students and assigned staff read revision tasks',
    'attendance scoped read',
    'student followups scoped read',
    'students and assigned staff read practice attempts',
    'written submissions scoped read'
  ];
  for (const name of expected) {
    assert.ok(sql.includes('DROP POLICY IF EXISTS "' + name + '"'), 'missing replacement for ' + name);
  }
  assert.equal((sql.match(/CREATE POLICY /g) || []).length, expected.length);
  assert.equal((sql.match(/FOR SELECT TO authenticated/g) || []).length, expected.length);
  assert.equal((sql.match(/current_role\(\)/g) || []).length > expected.length, true);
});

test('assigned staff branches remain course-scoped and require an active teaching role', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261110269000_require_active_role_for_personal_record_reads.sql', import.meta.url), 'utf8');
  assert.match(sql, /current_role\(\)\)::text IN \('teacher','staff'\)/i);
  assert.match(sql, /course_assignments/);
  assert.match(sql, /a\.teacher_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(sql, /current_role\(\)\) = 'admin'::public\.app_role/i);
});

test('migration is policy-only and does not mutate existing student or financial records', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261110269000_require_active_role_for_personal_record_reads.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(sql, /\b(INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|TRUNCATE\s+TABLE|DROP\s+TABLE)\b/i);
});
