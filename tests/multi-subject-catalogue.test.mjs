import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('synthetic catalogue covers all three target cohorts and core subjects', async () => {
  const seed = await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
  for (const slug of [
    'jmt-hsc-2027-multi-subject-demo',
    'jmt-hsc-2028-multi-subject-demo',
    'jmt-admission-multi-subject-demo',
  ]) assert.ok(seed.includes(slug), slug);
  for (const subject of [
    'Chemistry','Physics','Biology','Mathematics','Higher Mathematics',
    'English','Bangla','ICT',
  ]) assert.ok(seed.includes(`'${subject}'`), subject);
  assert.ok(seed.includes("'bangla'"), 'Bangla concept coverage');
  assert.ok(seed.includes("'higher-mathematics'"), 'Higher Mathematics concept coverage');
  assert.ok(seed.includes("'bangla','bangla-reading-comprehension','bangla-language-grammar'"), 'Bangla prerequisite graph stays within Bangla');
  assert.ok(seed.includes('false, false'), 'synthetic courses remain unpublished and closed');
});

test('product scope explicitly defines JMT Academy as subject-agnostic', async () => {
  const scope = await readFile(new URL('../docs/PRODUCT_SCOPE.md', import.meta.url), 'utf8');
  assert.ok(scope.includes('not a Chemistry-only website'));
  assert.ok(scope.includes('HSC 2027'));
  assert.ok(scope.includes('HSC 2028'));
  assert.ok(scope.includes('Admission Batch'));
  assert.ok(scope.includes('Bangla'));
  assert.ok(scope.includes('English'));
  assert.ok(scope.includes('Offline academy'));
});

test('admin course studio creates subject catalogue entries dynamically', async () => {
  const action = await readFile(new URL('../app/actions/course-studio.ts', import.meta.url), 'utf8');
  const studio = await readFile(new URL('../app/admin/courses/page.tsx', import.meta.url), 'utf8');
  const catalogue = await readFile(new URL('../components/course-catalogue.tsx', import.meta.url), 'utf8');
  assert.ok(action.includes("db.from('academic_subjects').upsert(subjectRows"));
  assert.ok(action.includes("db.from('course_subjects').upsert(subjectLinks"));
  assert.ok(action.includes("db.from('course_subjects').delete()"));
  assert.ok(studio.includes('Subjects (comma separated)'));
  assert.ok(catalogue.includes('...(c.subjects??[])'));
});
