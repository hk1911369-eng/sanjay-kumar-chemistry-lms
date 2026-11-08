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
  assert.ok(page.includes("p_student_ids: null"));
  assert.ok(page.includes('fetchAllPages'));
  assert.ok(page.includes(".in('id', activeStudentIds)"));
  assert.ok(page.includes('.range(from, to)'));
  assert.ok(!page.includes('.limit(250)'));
  assert.ok(!page.includes('.limit(1000)'));
  const compactPage = page.replace(/\s+/g, '');
  assert.ok(compactPage.includes(".in('course_id',courseIds)"));
  assert.ok(compactPage.includes(".gte('occurrence_count',2)"));
  assert.ok(page.includes('Class topic heatmap'));
  assert.ok(page.includes('Number(item.evidence_count) < 2'));
  assert.ok(page.includes('averageMastery'));
  assert.ok(page.includes('Learner-wide preferences and global goals are not shown'));
  const navigation = await readFile(new URL('../components/portal-layout.tsx', import.meta.url), 'utf8');
  assert.equal((navigation.match(/key: 'learning-insights'/g) ?? []).length, 3);
});

test('teacher revision assignments are scoped to paid learners and mapped concepts', async () => {
  const page = await readFile(new URL('../app/teacher/learning/page.tsx', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/teacher-learning.ts', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20261108221622_add_secure_teacher_revision_assignment.sql', import.meta.url), 'utf8');
  assert.ok(page.includes('assignTeacherRevisionTask'));
  assert.ok(page.includes('courseSubjectKeys'));
  assert.ok(page.includes('alreadyPending'));
  assert.ok(page.includes('name="student_id"'));
  assert.ok(action.includes("rpc('assign_teacher_revision_task'"));
  assert.ok(migration.includes("v_role NOT IN ('admin', 'teacher', 'staff')"));
  assert.ok(migration.includes('a.teacher_id = auth.uid()'));
  assert.ok(migration.includes('e.admission_fee_paid IS TRUE'));
  assert.ok(migration.includes('e.paid_through >= v_period_end'));
  assert.ok(migration.includes('lc.is_published IS TRUE'));
  assert.ok(migration.includes('REVOKE ALL ON FUNCTION'));
  const audited = await readFile(new URL('../supabase/migrations/20261108221907_audit_and_scope_teacher_revision_assignments.sql', import.meta.url), 'utf8');
  assert.ok(audited.includes('c.is_published IS TRUE'));
  assert.ok(audited.includes("'teacher_revision_assigned'"));
  assert.ok(audited.includes('public.audit_logs'));
});

test('teacher revision RPC fails closed for missing roles and inactive students', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108221803_secure_teacher_revision_assignment_fail_closed_role_guard.sql', import.meta.url), 'utf8');
  assert.ok(migration.includes('v_role IS NULL'));
  assert.ok(migration.includes("v_role IS DISTINCT FROM 'admin'"));
  assert.ok(migration.includes('p.is_active IS TRUE'));
  assert.ok(migration.includes('REVOKE ALL ON FUNCTION'));
});
