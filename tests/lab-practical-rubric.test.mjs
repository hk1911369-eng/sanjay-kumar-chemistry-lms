import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the practical rubric has six fixed weighted criteria adding to one hundred', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110242000_add_weighted_lab_practical_rubric.sql', import.meta.url), 'utf8');
  assert.match(migration, /'hypothesis'[\s\S]*'method'[\s\S]*'observations_measurements'[\s\S]*'analysis_interpretation'[\s\S]*'conclusion_reflection'[\s\S]*'safety_integrity'/);
  assert.match(migration, /array\[15,20,25,20,15,5\]/i);
  assert.match(migration, /jsonb_object_keys\(p_scores\)/i);
  assert.match(migration, /private\.lab_notebook_rubric_total\(new\.rubric_scores\)/i);
  assert.match(migration, /new\.score is distinct from private\.lab_notebook_rubric_total/i);
});

test('students cannot write rubric marks and returned work has no rubric result', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110242000_add_weighted_lab_practical_rubric.sql', import.meta.url), 'utf8');
  assert.match(migration, /new\.rubric_scores <> '\{\}'::jsonb/i);
  assert.match(migration, /new\.status = 'returned'[\s\S]*new\.rubric_scores <> '\{\}'::jsonb/i);
  assert.match(migration, /new\.status = 'reviewed'[\s\S]*lab_notebook_rubric_total/i);
  assert.match(migration, /rubric_scores jsonb not null default '\{\}'::jsonb/i);
});

test('teacher review action validates each criterion and computes its own total', async () => {
  const action = await readFile(new URL('../app/actions/lab-notebooks.ts', import.meta.url), 'utf8');
  assert.match(action, /rubric_hypothesis/);
  assert.match(action, /rubric_method/);
  assert.match(action, /rubric_observations_measurements/);
  assert.match(action, /rubric_analysis_interpretation/);
  assert.match(action, /rubric_conclusion_reflection/);
  assert.match(action, /rubric_safety_integrity/);
  assert.match(action, /value>criterion\.max/);
  assert.match(action, /Math\.round\(Object\.values\(rubricScores\)/);
  assert.match(action, /rubric_scores:rubricScores/);
});

test('teacher and student workspaces reveal each weighted criterion and the calculated score', async () => {
  const [teacher, student] = await Promise.all([
    readFile(new URL('../app/teacher/lab-notebooks/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/student/lab-notebook/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(teacher, /Weighted practical rubric/);
  assert.match(teacher, /rubric_hypothesis/);
  assert.match(teacher, /lab safety and integrity/i);
  assert.match(student, /review\.rubric_scores/);
  assert.match(student, /Score:/);
});
