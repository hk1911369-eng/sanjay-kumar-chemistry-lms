import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('all student-facing course-content RLS branches require an active student role and current paid enrollment', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110269000_require_active_student_role_for_course_content.sql', import.meta.url), 'utf8');
  const policies = [
    'assignments scoped read',
    'chapters visible to enrolled students and assigned teachers',
    'lessons visible by enrollment or assignment',
    'lesson resources scoped read',
    'live classes scoped read',
    'quizzes scoped read',
    'quiz questions scoped read',
    'written exams scoped read',
    'written exam questions scoped read',
  ];

  for (const name of policies) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const block = migration.match(new RegExp('CREATE POLICY "' + escaped + '"[\\s\\S]*?;'));
    assert.ok(block, 'Missing rebuilt policy: ' + name);
    assert.match(block[0], /current_role\(\)\) = 'student'::public\.app_role/i, 'Student branch must require active student role: ' + name);
    assert.match(block[0], /e\.status = 'active'/i, 'Student branch must require active enrollment: ' + name);
    assert.match(block[0], /e\.admission_fee_paid IS TRUE/i, 'Student branch must require paid admission: ' + name);
    assert.match(block[0], /e\.paid_through >=/i, 'Student branch must require current Bangladesh billing period: ' + name);
  }

  assert.match(migration, /e\.delivery_mode IS NULL OR e\.delivery_mode = 'live_recorded'/i);
  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM/i);
});
