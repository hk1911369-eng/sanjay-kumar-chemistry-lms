import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('administrator publication actions validate assessment completeness', async () => {
  const actions = await readFile(new URL('../app/actions/academic.ts', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/academic/page.tsx', import.meta.url), 'utf8');
  for (const name of ['publishAssignment', 'publishQuiz', 'publishWrittenExam']) {
    assert.match(actions, new RegExp('export async function ' + name));
    const start = actions.indexOf('export async function ' + name);
    const next = actions.indexOf('export async function ', start + 20);
    const body = actions.slice(start, next < 0 ? actions.length : next);
    assert.match(body, /role!=='admin'/);
    assert.match(body, /published:false/);
  }
  assert.match(actions, /questions\.some\(q=>!keyIds\.has\(q\.id\)\)/);
  assert.match(actions, /key\.correct_option===null/);
  assert.match(page, /action=\{publishAssignment\}/);
  assert.match(page, /action=\{publishQuiz\}/);
  assert.match(page, /action=\{publishWrittenExam\}/);
});
