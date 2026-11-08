import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('teacher analytics only exposes goals from assigned courses with active enrollment', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108214359_learning_os_staff_course_goal_visibility.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes("current_role())::text IN ('teacher','staff')"));
  assert.ok(migration.includes('course_id IS NOT NULL'));
  assert.ok(migration.includes('a.teacher_id = (SELECT auth.uid())'));
  assert.ok(migration.includes('a.course_id = learner_study_goals.course_id'));
  assert.ok(migration.includes("e.status = 'active'"));
  assert.ok(migration.includes('e.student_id = learner_study_goals.student_id'));
});

test('teacher analytics is role-gated and reads only assigned course/student signals', async () => {
  const page = await readFile(new URL('../app/teacher/learning/page.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes("!['admin','teacher','staff'].includes(role)"));
  assert.ok(page.includes("rpc('get_assigned_student_enrollments'"));
  assert.ok(page.includes(".in('course_id',courseIds)"));
  assert.ok(page.includes(".gte('occurrence_count',2)"));
  assert.ok(page.includes('Learner-wide preferences and global goals are not shown'));
  const navigation = await readFile(new URL('../components/portal-layout.tsx', import.meta.url), 'utf8');
  assert.equal((navigation.match(/key: 'learning-insights'/g) ?? []).length, 3);
});
