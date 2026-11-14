import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('learning RPCs require published course content and active paid enrollment', async () => {
  const migration = await read('supabase/migrations/20261114120000_require_active_course_for_learning_rpcs.sql');
  const section = (start, end) => migration.slice(migration.indexOf(start), end ? migration.indexOf(end) : undefined);

  const lesson = section('CREATE OR REPLACE FUNCTION public.record_lesson_completion', 'CREATE OR REPLACE FUNCTION public.submit_quiz_attempt');
  for (const guard of ['JOIN public.courses c ON c.id = l.course_id', 'l.is_published IS TRUE', 'c.is_published IS TRUE', 'c.archived_at IS NULL', 'e.student_id = v_student_id', "e.status = 'active'", 'e.admission_fee_paid IS TRUE']) {
    assert.ok(lesson.includes(guard), 'lesson guard missing: ' + guard);
  }

  const quiz = section('CREATE OR REPLACE FUNCTION public.submit_quiz_attempt', 'CREATE OR REPLACE FUNCTION public.record_simulation_completion');
  for (const guard of ['JOIN public.courses c ON c.id = q.course_id', 'q.published IS TRUE', 'c.is_published IS TRUE', 'c.archived_at IS NULL', 'a.student_id = v_user', 'e.student_id = v_user', "e.status = 'active'", 'jsonb_each_text(p_answers)', 'v_attempt.started_at + make_interval']) {
    assert.ok(quiz.includes(guard), 'quiz guard missing: ' + guard);
  }

  const simulation = section('CREATE OR REPLACE FUNCTION public.record_simulation_completion', 'CREATE OR REPLACE FUNCTION public.create_exam_war_room_target');
  for (const guard of ['c.is_published IS TRUE', 'c.archived_at IS NULL', 'e.student_id = v_student_id', 'p_duration_seconds > 7200']) {
    assert.ok(simulation.includes(guard), 'simulation guard missing: ' + guard);
  }

  const examPlan = section('CREATE OR REPLACE FUNCTION public.create_exam_war_room_target');
  for (const guard of ['c.is_published IS TRUE', 'c.archived_at IS NULL', 'e.student_id = v_student_id', 'PERFORM 1 FROM public.profiles WHERE id = v_student_id FOR UPDATE']) {
    assert.ok(examPlan.includes(guard), 'exam-plan guard missing: ' + guard);
  }
});

test('learning RPCs pin search_path and enforce a signed-in student identity', async () => {
  const migration = await read('supabase/migrations/20261114120000_require_active_course_for_learning_rpcs.sql');
  const functions = migration.split('CREATE OR REPLACE FUNCTION public.').slice(1);
  assert.equal(functions.length, 4);
  for (const fn of functions) {
    assert.ok(fn.includes('SECURITY DEFINER'));
    assert.ok(fn.includes('SET search_path = pg_catalog, public, pg_temp'));
    assert.ok(fn.includes('auth.uid()'));
    assert.ok(fn.includes('current_role()'));
    assert.ok(fn.includes("'student'::public.app_role"));
  }
});

test('learning RPC execute grants exclude PUBLIC and anon and retain authenticated access', async () => {
  const migration = await read('supabase/migrations/20261114120000_require_active_course_for_learning_rpcs.sql');
  for (const signature of [
    'record_lesson_completion(uuid,uuid)',
    'submit_quiz_attempt(uuid,jsonb)',
    'record_simulation_completion(uuid,text,integer)',
    'create_exam_war_room_target(uuid,text,date,integer,numeric)',
  ]) {
    assert.ok(migration.includes('REVOKE ALL ON FUNCTION public.' + signature + ' FROM PUBLIC, anon;'));
    assert.ok(migration.includes('GRANT EXECUTE ON FUNCTION public.' + signature + ' TO authenticated;'));
  }
});
