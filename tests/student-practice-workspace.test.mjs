import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('practice studio is restricted to active, paid student courses and mapped subjects', async () => {
  const page = await read('app/practice/page.tsx');
  assert.match(page, /profile\?\.role !== 'student'/);
  assert.match(page, /\.eq\('status', 'active'\)/);
  assert.match(page, /\.eq\('admission_fee_paid', true\)/);
  assert.match(page, /\.gte\('paid_through', periodEnd\)/);
  assert.match(page, /from\('course_subjects'\)/);
  assert.match(page, /from\('academic_subjects'\)/);
  assert.match(page, /get_student_practice_questions/);
  assert.match(page, /p_limit: 20/);
});

test('practice answer action validates input and exposes only stable errors', async () => {
  const action = await read('app/actions/student-practice.ts');
  assert.match(action, /submit_student_practice_answer/);
  assert.match(action, /error\.code === '23505'/);
  assert.match(action, /error\.code === 'P0002'/);
  assert.doesNotMatch(action, /error\.message/);
  assert.match(action, /revalidatePath\('\/student'\)/);
});

test('student workspace reveals feedback only after server-confirmed submission', async () => {
  const component = await read('components/student-practice-workspace.tsx');
  assert.match(component, /submitStudentPracticeAnswer\(questionId, selectedOption\)/);
  assert.match(component, /result\?\.correctOption/);
  assert.match(component, /result\.explanation/);
  assert.match(component, /Evidence added to your learning profile/);
  assert.match(component, /disabled=\{Boolean\(result\)/);
});

test('practice studio is discoverable in student navigation', async () => {
  const layout = await read('components/portal-layout.tsx');
  assert.match(layout, /key: 'practice', label: 'Practice studio', href: '\/practice'/);
});
