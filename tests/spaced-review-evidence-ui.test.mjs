import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const studentPage = await readFile(new URL('../app/student/page.tsx', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../components/learning-os-dashboard.tsx', import.meta.url), 'utf8');
const action = await readFile(new URL('../app/actions/learning.ts', import.meta.url), 'utf8');

test('student dashboard loads the revision source type needed for evidence-aware guidance', () => {
  assert.match(studentPage, /revision_tasks'\)\.select\([^)]*source_type/i);
  assert.match(studentPage, /revisionError=\{params\.revision_error\}/i);
});

test('spaced review tasks explain the required retrieval practice and link to practice studio', () => {
  assert.match(dashboard, /task\.source_type === 'spaced_repetition'/i);
  assert.match(dashboard, /concept-linked practice question or assessment after this review is due/i);
  assert.match(dashboard, /Open Practice Studio/i);
});

test('revision action distinguishes missing evidence from a task that is not due', () => {
  assert.match(action, /error\?\.code === 'P0001'[\s\S]*revision_error=evidence/i);
  assert.match(action, /error\?\.code === '22023'[\s\S]*revision_error=not_due/i);
});
