import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('student and teacher practical workspaces are connected to the portals', async () => {
  const [student, teacher, studentAction, teacherAction] = await Promise.all([
    readFile(new URL('../app/student/lab-notebook/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/teacher/lab-notebooks/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/student/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/teacher/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(student, /saveLabNotebook/);
  assert.match(student, /measurements/);
  assert.match(student, /teacher_feedback/);
  assert.match(teacher, /reviewLabNotebook/);
  assert.match(teacher, /status','submitted'/);
  assert.match(studentAction, /\/student\/lab-notebook/);
  assert.match(teacherAction, /\/teacher\/lab-notebooks/);
});

test('notebook server actions validate payloads and defer authorisation to RLS', async () => {
  const actions = await readFile(new URL('../app/actions/lab-notebooks.ts', import.meta.url), 'utf8');
  assert.match(actions, /parseMeasurements/);
  assert.match(actions, /raw.length > 30000/);
  assert.match(actions, /value\.length > 100/);
  assert.match(actions, /feedback\.length\s*>\s*4000/);
  assert.match(actions, /score\s*>\s*100/);
  assert.match(actions, /\.eq\('student_id',user\.id\)/);
  assert.match(actions, /\.eq\('status','submitted'\)/);
});
