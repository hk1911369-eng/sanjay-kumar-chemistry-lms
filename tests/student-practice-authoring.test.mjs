import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('staff authoring validates content and relies on course-subject RLS and database scope trigger', async () => {
  const action = await read('app/actions/student-practice-authoring.ts');
  const migration = await read('supabase/migrations/20261109290000_add_student_practice_question_engine.sql');
  assert.match(action, /profile\?\.role/);
  assert.match(action, /options\.length < 2 \|\| options\.length > 6/);
  assert.match(action, /correctOption >= options\.length/);
  assert.match(action, /created_by: user\.id/);
  assert.match(action, /is_published: isPublished/);
  assert.match(migration, /guard_student_practice_question_scope/);
  assert.match(migration, /practice question subject must belong to its course/i);
  assert.match(migration, /practice question concept must belong to its subject/i);
});

test('practice authoring page only offers courses assigned to staff or courses to admins', async () => {
  const page = await read('app/teacher/practice/page.tsx');
  assert.match(page, /\['admin', 'teacher', 'staff'\]/);
  assert.match(page, /from\('course_assignments'\)/);
  assert.match(page, /\.eq\('teacher_id', user\.id\)/);
  assert.match(page, /from\('course_subjects'\)/);
  assert.match(page, /createStudentPracticeQuestion/);
  assert.match(page, /Publish immediately/);
  assert.match(page, /from\('learning_concepts'\)/);
  assert.match(page, /name="concept_id"/);
});

test('practice authoring is available in teacher, staff and admin navigation', async () => {
  const layout = await read('components/portal-layout.tsx');
  assert.equal((layout.match(/href: '\/teacher\/practice'/g) || []).length >= 3, true);
});
