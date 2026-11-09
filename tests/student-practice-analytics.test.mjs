import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('practice analytics is limited to admin or assigned teaching courses', async () => {
  const page = await readFile(new URL('../app/teacher/practice/analytics/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /\['admin', 'teacher', 'staff'\]/);
  assert.match(page, /from\('course_assignments'\)/);
  assert.match(page, /\.eq\('teacher_id', user\.id\)/);
  assert.match(page, /from\('student_practice_attempts'\)/);
  assert.match(page, /\.limit\(5000\)/);
});

test('practice analytics uses aggregate response data without selecting student identities', async () => {
  const page = await readFile(new URL('../app/teacher/practice/analytics/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /select\('question_id,selected_option,is_correct,awarded_marks'\)/);
  assert.doesNotMatch(page, /select\([^\n]*student_id/);
  assert.match(page, /stats\.correct/);
  assert.match(page, /mostSelectedWrongOption/);
});

test('intervention flags require repeated evidence and low accuracy, not one response', async () => {
  const page = await readFile(new URL('../app/teacher/practice/analytics/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /question\.attempts >= 3/);
  assert.match(page, /question\.accuracy \?\? 100\) < 60/);
  assert.match(page, /No clear difficulty pattern yet/);
});

test('practice analytics is available from the staff portal navigation', async () => {
  const layout = await readFile(new URL('../components/portal-layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /key: 'practice-analytics', label: 'Practice analytics', href: '\/teacher\/practice\/analytics'/);
});
