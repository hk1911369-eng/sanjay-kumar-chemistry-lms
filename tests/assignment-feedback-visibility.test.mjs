import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(
  new URL('../app/academic/page.tsx', import.meta.url),
  'utf8',
);
const actions = await readFile(
  new URL('../app/actions/academic.ts', import.meta.url),
  'utf8',
);

test('student assignment history is scoped to the signed-in student', () => {
  assert.match(
    page,
    /: supabase\.from\('assignment_submissions'\)[\s\S]*?\.eq\('student_id',user\.id\)/,
  );
});

test('assignment cards show submission state, timestamp, marks and teacher feedback', () => {
  assert.match(page, /Submitted · awaiting marking/);
  assert.match(page, /Submitted: \{new Date\(ownSubmission\.submitted_at\)/);
  assert.match(page, /Result: \{ownSubmission\.marks\} \/ \{a\.max_marks\}/);
  assert.match(page, /Teacher feedback:/);
});

test('graded assignments are not offered for resubmission in the student workspace', () => {
  assert.match(page, /!staff&&!graded&&<form action=\{submitAssignment\}/);
  assert.match(page, /ownSubmission\?'Update your answer':'Your answer'/);
});

test('assignment submission action refuses edits after grading', () => {
  assert.match(actions, /if\(existing\?\.marks!==null&&existing\?\.marks!==undefined\) redirect\('\/academic\?error=already_graded'\)/);
});
