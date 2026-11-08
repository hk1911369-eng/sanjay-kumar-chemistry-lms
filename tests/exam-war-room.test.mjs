import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Exam War Room targets are private to the student and administrators', async () => {
  const migration=await readFile(new URL('../supabase/migrations/20261108220330_learning_os_exam_war_room_targets_and_revision_plans.sql',import.meta.url),'utf8');
  assert.ok(migration.includes('ALTER TABLE public.learner_exam_targets ENABLE ROW LEVEL SECURITY'));
  assert.ok(migration.includes('student_id=(SELECT auth.uid())'));
  assert.ok(migration.includes("current_role()) IS DISTINCT FROM 'student'::public.app_role"));
  assert.ok(migration.includes('e.admission_fee_paid IS TRUE'));
  assert.ok(migration.includes('e.paid_through>=v_period_end'));
});

test('Exam War Room generates revision tasks from published course concepts and evidence', async () => {
  const migration=await readFile(new URL('../supabase/migrations/20261108220330_learning_os_exam_war_room_targets_and_revision_plans.sql',import.meta.url),'utf8');
  assert.ok(migration.includes('public.course_subjects'));
  assert.ok(migration.includes('lc.is_published IS TRUE'));
  assert.ok(migration.includes('public.learner_concept_mastery'));
  assert.ok(migration.includes("'exam_war_room'"));
  const taskCompatibility = await readFile(new URL('../supabase/migrations/20261108220456_learning_os_align_exam_war_room_with_revision_task_enums.sql', import.meta.url), 'utf8');
  assert.ok(taskCompatibility.includes("'exam_plan'"));
  assert.ok(taskCompatibility.includes("status='skipped'"));
  assert.ok(migration.includes('v_daily_slots'));
  assert.ok(migration.includes('You can have up to three active exam plans'));
});

test('Exam War Room UI calls protected create and cancel actions', async () => {
  const page=await readFile(new URL('../app/student/exam-war-room/page.tsx',import.meta.url),'utf8');
  const actions=await readFile(new URL('../app/actions/exam-war-room.ts',import.meta.url),'utf8');
  const nav=await readFile(new URL('../components/portal-layout.tsx',import.meta.url),'utf8');
  assert.ok(page.includes('createExamWarRoomTarget'));
  assert.ok(page.includes('cancelExamWarRoomTarget'));
  assert.ok(page.includes(".in('source_type',['exam_plan','exam_war_room'])"));
  assert.ok(actions.includes("rpc('create_exam_war_room_target'"));
  assert.ok(actions.includes("rpc('cancel_exam_war_room_target'"));
  assert.ok(nav.includes("key: 'exam-war-room'"));
});
