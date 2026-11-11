import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261111182000_target_practice_to_revision_concept.sql', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/practice/page.tsx', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../components/learning-os-dashboard.tsx', import.meta.url), 'utf8');

test('practice RPC accepts an optional concept filter without leaving the old signature behind', () => {
  assert.match(migration, /DROP FUNCTION IF EXISTS public\.get_student_practice_questions\(uuid, uuid, text, integer\)/i);
  assert.match(migration, /p_concept_id uuid DEFAULT NULL/i);
  assert.match(migration, /p_concept_id IS NULL OR q\.concept_id = p_concept_id/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_student_practice_questions\(uuid, uuid, text, integer, uuid\) FROM PUBLIC, anon/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_student_practice_questions\(uuid, uuid, text, integer, uuid\) TO authenticated/i);
});

test('practice page validates a requested concept against the selected course subject map', () => {
  assert.match(page, /concept\?: string/i);
  assert.match(page, /learning_concepts'\)\.select\('id,subject_id,title'\)/i);
  assert.match(page, /subjectIds\.includes\(requestedConcept\.subject_id\)/i);
  assert.match(page, /p_concept_id: concept\?\.id \?\? null/i);
  assert.match(page, /Review focus: \{concept\.title\}/i);
});

test('revision queue links directly to the exact concept practice set', () => {
  assert.match(dashboard, /'&concept=' \+ encodeURIComponent\(task\.concept_id \?\? ''\)/i);
});
