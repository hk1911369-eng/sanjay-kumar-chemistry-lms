import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('admin learning graph reports published, mapped, and unmapped curriculum coverage', async () => {
  const page = await readFile(new URL('../app/admin/learning/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /publishedCountBySubject/);
  assert.match(page, /mappedConceptIds/);
  assert.match(page, /mappedLessonIds/);
  assert.match(page, /unmappedPublishedConceptCount/);
  assert.match(page, /unmappedPublishedLessonCount/);
  assert.match(page, /Learning graph readiness/);
  assert.match(page, /This is a curriculum-coverage check, not a student-performance score/);
  assert.match(page, /Work remaining before curriculum-driven adaptation/);
  assert.match(page, /concepts connected to lessons/);
});

test('curriculum readiness blocks adaptation claims when lesson or concept foundations are empty', async () => {
  const page = await readFile(new URL('../app/admin/learning/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /publishedLessonCount === 0/);
  assert.match(page, /publishedConceptCount === 0/);
  assert.ok(page.includes('published lesson(s) still need concept mapping'));
  assert.match(page, /published concept\(s\) are not connected to any lesson/);
  assert.match(page, /Continue reviewing prerequisite quality before enabling predictive features/);
});

test('readiness breakdown remains data-driven for future subjects', async () => {
  const page = await readFile(new URL('../app/admin/learning/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /subjects\.map\(subject/);
  assert.match(page, /conceptCountBySubject\.get\(subject\.id\)/);
  assert.match(page, /publishedCountBySubject\.get\(subject\.id\)/);
  assert.doesNotMatch(page, /if \(subject\.name === ['"]Chemistry['"]/);
});

test('course readiness is scoped to each course rather than shared across courses', async () => {
  const page = await readFile(new URL('../app/admin/learning/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /course_subjects/);
  assert.match(page, /courseCoverage = courses\.map/);
  assert.match(page, /courseLessonIds/);
  assert.match(page, /mappedPublishedConcepts/);
  assert.match(page, /concept\.exam_tracks\.length === 0/);
  assert.match(page, /courseTrack\.includes\(track\.toLowerCase\(\)\)/);
  assert.match(page, /courseCoverageBlockers/);
  assert.match(page, /A concept mapped in one course does not count as covered in another/);
});

test('only published lessons count toward learner-facing curriculum readiness', async () => {
  const page = await readFile(new URL('../app/admin/learning/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /lessons\.filter\(lesson => lesson\.is_published\)/);
  assert.match(page, /unmappedPublishedLessonCount/);
  assert.match(page, /published lessons without a concept link/);
});
