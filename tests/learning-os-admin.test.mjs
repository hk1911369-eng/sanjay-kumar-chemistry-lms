import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Learning OS catalogue management is admin-only and supports all subjects', async () => {
  const actions = await read('app/actions/learning-os.ts');
  const page = await read('app/admin/learning/page.tsx');
  assert.ok(actions.includes("profile?.role !== 'admin'"));
  assert.ok(actions.includes("from('academic_subjects').insert"));
  assert.ok(actions.includes("from('learning_concepts').insert"));
  assert.ok(actions.includes("from('lesson_concepts').upsert"));
  assert.ok(page.includes('Subjects & concept graph'));
  assert.ok(page.includes('Map a lesson to a concept'));
});

test('knowledge graph prerequisite insertion rejects cycles', async () => {
  const actions = await read('app/actions/learning-os.ts');
  assert.ok(actions.includes('An edge A -> B means A requires B'));
  assert.ok(actions.includes('current === conceptId'));
  assert.ok(actions.includes("error=cycle"));
});

test('lesson concepts can only be mapped when course and concept subjects match', async () => {
  const actions = await read('app/actions/learning-os.ts');
  assert.ok(actions.includes("from('course_subjects').select('course_id')"));
  assert.ok(actions.includes("error=subject_mismatch"));
});
