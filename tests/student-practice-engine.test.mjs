import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261109290000_add_student_practice_question_engine.sql', import.meta.url),
  'utf8',
);

test('student practice is a separate, unpublished-by-default content model with subject and concept integrity', () => {
  assert.match(migration, /create table if not exists public\.student_practice_questions/i);
  assert.match(migration, /subject_id uuid not null references public\.academic_subjects/i);
  assert.match(migration, /is_published boolean not null default false/i);
  assert.match(migration, /course_subjects cs[\s\S]*cs\.course_id = new\.course_id[\s\S]*cs\.subject_id = new\.subject_id/i);
  assert.match(migration, /lc\.id = new\.concept_id and lc\.subject_id = new\.subject_id/i);
});

test('students cannot read answer keys directly or write practice attempts directly', () => {
  assert.match(migration, /revoke all on public\.student_practice_questions from public, anon, authenticated/i);
  assert.match(migration, /grant select on public\.student_practice_questions to authenticated/i);
  assert.match(migration, /revoke all on public\.student_practice_attempts from public, anon, authenticated/i);
  assert.match(migration, /grant select on public\.student_practice_attempts to authenticated/i);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete)[^;]*student_practice_attempts/i);
  assert.match(migration, /returns table \([\s\S]*question_text text,[\s\S]*options jsonb,[\s\S]*marks numeric[\s\S]*\)/i);
  const fetchFunction = migration.slice(
    migration.indexOf('create or replace function public.get_student_practice_questions'),
    migration.indexOf('create or replace function public.submit_student_practice_answer'),
  );
  assert.doesNotMatch(fetchFunction, /correct_option|explanation/);
});

test('question delivery and answer submission enforce current paid access and prevent repeat attempts', () => {
  assert.match(migration, /public\.get_student_practice_questions/i);
  assert.match(migration, /public\.submit_student_practice_answer/i);
  assert.match(migration, /e\.status = 'active'/i);
  assert.match(migration, /e\.admission_fee_paid is true/i);
  assert.match(migration, /e\.paid_through >=/i);
  assert.match(migration, /unique \(student_id, question_id\)/i);
  assert.match(migration, /on conflict \(student_id, question_id\) do nothing/i);
  assert.match(migration, /this practice question has already been answered/i);
});

test('practice answers feed evidence, spaced review and repeated-mistake memory', () => {
  assert.match(migration, /insert into public\.learning_events/i);
  assert.match(migration, /'practice_submitted'/i);
  assert.match(migration, /insert into public\.learner_concept_mastery/i);
  assert.match(migration, /next_review_at/i);
  assert.match(migration, /insert into public\.learner_mistake_memory/i);
  assert.match(migration, /occurrence_count = existing\.occurrence_count \+ 1/i);
  assert.match(migration, /resolved_at = null/i);
});
