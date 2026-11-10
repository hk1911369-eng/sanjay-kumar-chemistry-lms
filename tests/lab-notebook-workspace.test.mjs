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
  assert.match(actions, /rubric_hypothesis/);
  assert.match(actions, /rubric_safety_integrity/);
  assert.match(actions, /score=Math\.round\(Object\.values\(rubricScores\)/);
  assert.match(actions, /\.eq\('student_id',user\.id\)/);
  assert.match(actions, /\.eq\('status','submitted'\)/);
});


test('structured measurement editor serialises validated notebook readings without manual JSON', async () => {
  const [student, editor, styles] = await Promise.all([
    readFile(new URL('../app/student/lab-notebook/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/lab-measurement-editor.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
  ]);
  assert.match(student, /LabMeasurementEditor/);
  assert.equal((student.match(/<LabMeasurementEditor/g) ?? []).length, 3);
  assert.match(editor, /name="measurements"/);
  assert.match(editor, /JSON\.stringify\(rows\.filter/);
  assert.match(editor, /rows\.length >= 100/);
  assert.match(editor, /maxLength=\{100\}/);
  assert.match(editor, /maxLength=\{40\}/);
  assert.match(editor, /type="button"/);
  assert.match(styles, /\.lab-measurement-row/);
  assert.match(styles, /@media\(max-width:620px\).*lab-measurement-row/s);
});


test('teachers receive submitted measurements in a readable responsive table', async () => {
  const [teacher, styles] = await Promise.all([
    readFile(new URL('../app/teacher/lab-notebooks/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
  ]);
  assert.match(teacher, /lab-measurement-review/);
  assert.match(teacher, /reading\.name/);
  assert.match(teacher, /reading\.value/);
  assert.match(teacher, /reading\.unit/);
  assert.match(teacher, /No measurements recorded/);
  assert.match(styles, /\.lab-measurement-review\{max-width:100%;overflow-x:auto/);
});
