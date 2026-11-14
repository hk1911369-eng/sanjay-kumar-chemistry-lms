import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('SECURITY DEFINER learning RPCs reject unpublished and archived courses', async () => {
  const migration = await read('supabase/migrations/20261114120000_require_active_course_for_learning_rpcs.sql');

  const lesson = migration.slice(
    migration.indexOf('CREATE OR REPLACE FUNCTION public.record_lesson_completion'),
    migration.indexOf('CREATE OR REPLACE FUNCTION public.submit_quiz_attempt'),
  );
  assert.match(lesson, /JOIN public\\.courses c ON c\\.id = l\\.course_id/i);
  assert.match(lesson, /l\\.is_published IS TRUE/i);
  assert.match(lesson, /c\\.is_published IS TRUE/i);
  assert.match(lesson, /c\\.archived_at IS NULL/i);
  assert.match(lesson, /e\\.student_id = v_student_id/i);
  assert.match(lesson, /e\\.status = 'active'/i);
  assert.match(lesson, /e\\.admission_fee_paid IS TRUE/i);

  const quiz = migration.slice(
    migration.indexOf('CREATE OR REPLACE FUNCTION public.submit_quiz_attempt'),
    migration.indexOf('CREATE OR REPLACE FUNCTION public.record_simulation_completion'),
  );
  assert.match(quiz, /JOIN public\\.courses c ON c\\.id = q\\.course_id/i);
  assert.match(quiz, /q\\.published IS TRUE/i);
  assert.match(quiz, /c\\.is_published IS TRUE/i);
  assert.match(quiz, /c\\.archived_at IS NULL/i);
  assert.match(quiz, /a\\.student_id = v_user/i);
  assert.match(quiz, /e\\.student_id = v_user/i);
  assert.match(quiz, /e\\.status = 'active'/i);
  assert.match(quiz, /jsonb_each_text\\(p_answers\\)/i);
  assert.match(quiz, /v_attempt\\.started_at \\+ make_interval/i);

  const simulation = migration.slice(
    migration.indexOf('CREATE OR REPLACE FUNCTION public.record_simulation_completion'),
    migration.indexOf('CREATE OR REPLACE FUNCTION public.create_exam_war_room_target'),
  );
  assert.match(simulation, /c\\.is_published IS TRUE/i);
  assert.match(simulation, /c\\.archived_at IS NULL/i);
  assert.match(simulation, /e\\.student_id = v_student_id/i);
  assert.match(simulation, /p_duration_seconds > 7200/i);

  const examPlan = migration.slice(
    migration.indexOf('CREATE OR REPLACE FUNCTION public.create_exam_war_room_target'),
  );
  assert.match(examPlan, /c\\.is_published IS TRUE/i);
  assert.match(examPlan, /c\\.archived_at IS NULL/i);
  assert.match(examPlan, /e\\.student_id = v_student_id/i);
  assert.match(examPlan, /PERFORM 1 FROM public\\.profiles WHERE id = v_student_id FOR UPDATE/i);
});

test('learning RPCs pin search_path and enforce a signed-in student identity', async () => {
  const migration = await read('supabase/migrations/20261114120000_require_active_course_for_learning_rpcs.sql');
  const functions = migration.split(/CREATE OR REPLACE FUNCTION public\\./i).slice(1);
  assert.equal(functions.length, 4);
  for (const fn of functions) {
    assert.match(fn, /SECURITY DEFINER/i);
    assert.match(fn, /SET search_path = pg_catalog, public, pg_temp/i);
    assert.match(fn, /auth\\.uid\\(\\)/i);
    assert.match(fn, /current_role\\(\\)/i);
    assert.match(fn, /'student'::public\\.app_role/i);
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
    assert.ok(migration.includes(`REVOKE ALL ON FUNCTION public.${signature} FROM PUBLIC, anon;`));
    assert.ok(migration.includes(`GRANT EXECUTE ON FUNCTION public.${signature} TO authenticated;`));
  }
});
