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
  assert.match(lesson, /JOIN public\.courses c ON c\.id = l\.course_id/i);
  assert.match(lesson, /c\.is_published IS TRUE/i);
  assert.match(lesson, /c\.archived_at IS NULL/i);

  const quiz = migration.slice(
    migration.indexOf('CREATE OR REPLACE FUNCTION public.submit_quiz_attempt'),
    migration.indexOf('CREATE OR REPLACE FUNCTION public.record_simulation_completion'),
  );
  assert.match(quiz, /JOIN public\.courses c ON c\.id = q\.course_id/i);
  assert.match(quiz, /c\.is_published IS TRUE/i);
  assert.match(quiz, /c\.archived_at IS NULL/i);

  const simulation = migration.slice(
    migration.indexOf('CREATE OR REPLACE FUNCTION public.record_simulation_completion'),
    migration.indexOf('CREATE OR REPLACE FUNCTION public.create_exam_war_room_target'),
  );
  assert.match(simulation, /c\.is_published IS TRUE/i);
  assert.match(simulation, /c\.archived_at IS NULL/i);

  const examPlan = migration.slice(
    migration.indexOf('CREATE OR REPLACE FUNCTION public.create_exam_war_room_target'),
  );
  assert.match(examPlan, /c\.is_published IS TRUE/i);
  assert.match(examPlan, /c\.archived_at IS NULL/i);
});

test('learning RPC grants remain limited to authenticated callers and never anon/public', async () => {
  const migration = await read('supabase/migrations/20261114120000_require_active_course_for_learning_rpcs.sql');
  for (const fn of [
    'record_lesson_completion(uuid,uuid)',
    'submit_quiz_attempt(uuid,jsonb)',
    'record_simulation_completion(uuid,text,integer)',
    'create_exam_war_room_target(uuid,text,date,integer,numeric)',
  ]) {
    assert.match(migration, new RegExp('REVOKE ALL ON FUNCTION public\\.' + fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' FROM PUBLIC, anon', 'i'));
    assert.match(migration, new RegExp('GRANT EXECUTE ON FUNCTION public\\.' + fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' TO authenticated', 'i'));
  }
});
