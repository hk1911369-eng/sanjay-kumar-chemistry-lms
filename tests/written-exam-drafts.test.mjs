import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261111110000_add_written_exam_autosave_recovery.sql', import.meta.url),
  'utf8',
);
const component = await readFile(
  new URL('../components/written-exam-attempt.tsx', import.meta.url),
  'utf8',
);
const page = await readFile(
  new URL('../app/academic/page.tsx', import.meta.url),
  'utf8',
);
const actions = await readFile(
  new URL('../app/actions/academic.ts', import.meta.url),
  'utf8',
);

test('written exam drafts are private and cannot be read or written through the Data API', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.written_exam_drafts/i);
  assert.match(migration, /ALTER TABLE public\.written_exam_drafts ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON public\.written_exam_drafts FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_written_exam_draft\(uuid\) TO authenticated/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.save_written_exam_draft\(uuid, jsonb, bigint\) TO authenticated/i);
});

test('draft load and save require active paid access and a published, unarchived course', () => {
  const loader = migration
    .split('CREATE OR REPLACE FUNCTION public.get_written_exam_draft')[1]
    .split('CREATE OR REPLACE FUNCTION public.save_written_exam_draft')[0];
  const saver = migration
    .split('CREATE OR REPLACE FUNCTION public.save_written_exam_draft')[1]
    .split('REVOKE ALL ON FUNCTION public.get_written_exam_draft')[0];

  for (const body of [loader, saver]) {
    assert.match(body, /public\.current_role\(\).*student/i);
    assert.match(body, /c\.is_published IS TRUE/i);
    assert.match(body, /c\.archived_at IS NULL/i);
    assert.match(body, /e\.status = 'active'/i);
    assert.match(body, /e\.admission_fee_paid IS TRUE/i);
    assert.match(body, /e\.paid_through >=/i);
    assert.match(body, /x\.starts_at/);
    assert.match(body, /x\.ends_at/);
  }
});

test('draft saves validate question IDs and use optimistic concurrency to prevent overwrites', () => {
  assert.match(migration, /jsonb_each\(p_answers\)/i);
  assert.match(migration, /q\.exam_id = p_exam_id[\s\S]*q\.id::text = answer\.key/i);
  assert.match(migration, /length\(answer\.value #>> '\{\}'\) > 12000/i);
  assert.match(migration, /v_current_version <> p_expected_version/i);
  assert.match(migration, /USING ERRCODE = '40001'/i);
});

test('final submission clears the draft and retains complete-answer validation', () => {
  assert.match(migration, /AFTER INSERT ON public\.written_exam_submissions/i);
  assert.match(migration, /DELETE FROM public\.written_exam_drafts[\s\S]*NEW\.exam_id[\s\S]*NEW\.student_id/i);
  const submissionPolicy = migration.split('CREATE POLICY "students submit written exams"')[1];
  assert.match(submissionPolicy, /c\.is_published IS TRUE/i);
  assert.match(submissionPolicy, /c\.archived_at IS NULL/i);
  assert.match(submissionPolicy, /jsonb_object_keys\(answers\)/i);
  assert.match(submissionPolicy, /e\.paid_through >=/i);
});

test('student exam question reads are blocked when the parent course is unpublished or archived', () => {
  const examPolicy = migration.split('CREATE POLICY "written exams scoped read"')[1]
    .split('DROP POLICY IF EXISTS "written exam questions scoped read"')[0];
  const questionPolicy = migration.split('CREATE POLICY "written exam questions scoped read"')[1]
    .split('-- Preserve answer-shape')[0];
  for (const body of [examPolicy, questionPolicy]) {
    assert.match(body, /c\.is_published IS TRUE/i);
    assert.match(body, /c\.archived_at IS NULL/i);
    assert.match(body, /e\.admission_fee_paid IS TRUE/i);
  }
});

test('student written exam workspace restores saved answers and flushes autosave before final submission', () => {
  assert.match(page, /get_written_exam_draft/);
  assert.match(page, /initialAnswers=/);
  assert.match(page, /initialVersion=/);
  assert.match(component, /setTimeout\([\s\S]*900/);
  assert.match(component, /saveWrittenExamDraft/);
  assert.match(component, /await persistRef\.current\(\)/);
  assert.match(component, /form\.requestSubmit\(\)/);
  assert.match(component, /aria-live="polite"/);
  assert.match(actions, /export async function saveWrittenExamDraft/);
});
