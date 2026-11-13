import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('curriculum authoring is exposed only through the admin learning workspace', async () => {
  const page = await readFile(new URL('../app/admin/learning/page.tsx', import.meta.url), 'utf8');
  const actions = await readFile(new URL('../app/actions/learning-os.ts', import.meta.url), 'utf8');
  assert.match(page, /createCourseChapter/);
  assert.match(page, /createCourseLesson/);
  assert.match(actions, /async function adminContext/);
  assert.match(actions, /profile\?\.is_active !== true \|\| profile\.role !== 'admin'/);
});

test('new chapters and lessons are always created as unpublished drafts', async () => {
  const actions = await readFile(new URL('../app/actions/learning-os.ts', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/admin/learning/page.tsx', import.meta.url), 'utf8');
  assert.match(actions, /published: false/);
  assert.match(actions, /is_published: false/);
  assert.match(page, /Create draft lesson/);
  assert.match(page, /Create draft chapter/);
});

test('lesson authoring validates course ownership, chapter ownership, and secure video URLs', async () => {
  const actions = await readFile(new URL('../app/actions/learning-os.ts', import.meta.url), 'utf8');
  assert.match(actions, /\.is\('archived_at', null\)/);
  assert.match(actions, /\.eq\('course_id', courseId\)\.maybeSingle\(\)/);
  assert.ok(actions.includes("!/^https:\\/\\//i.test(videoUrl)"));
  assert.match(actions, /content\.length > 30000/);
});

test('lesson authoring UI provides real teaching content fields and optional chapter assignment', async () => {
  const page = await readFile(new URL('../app/admin/learning/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /name="content"/);
  assert.match(page, /name="video_url"/);
  assert.match(page, /name="chapter_id"/);
  assert.match(page, /Lessons are always created unpublished/);
});

test('chapter publication requires substantive content and mapped published concepts from the course', async () => {
  const actions = await readFile(new URL('../app/actions/learning-os.ts', import.meta.url), 'utf8');
  assert.match(actions, /async function publishCourseChapter/);
  assert.ok(actions.includes("String(lesson.content ?? '').trim().length < 100"));
  assert.match(actions, /concept\.is_published && subjectIds\.includes\(concept\.subject_id\)/);
  assert.match(actions, /lessons\.some\(lesson => !mappedLessonIds\.has\(lesson\.id\)\)/);
});

test('lesson publication requires substantive content, published chapter and a published in-course concept', async () => {
  const actions = await readFile(new URL('../app/actions/learning-os.ts', import.meta.url), 'utf8');
  assert.match(actions, /async function publishCourseLesson/);
  assert.match(actions, /lesson\.chapter_id/);
  assert.match(actions, /if \(!chapter\?\.published\)/);
  assert.match(actions, /concepts \?\? \[\]\)\.some\(concept => concept\.is_published && subjectIds\.includes\(concept\.subject_id\)\)/);
});

test('chapter and lesson publication verify the draft-state update before reporting success', async () => {
  const actions = await readFile(new URL('../app/actions/learning-os.ts', import.meta.url), 'utf8');
  assert.match(actions, /\.eq\('published', false\)\.select\('id'\)\.maybeSingle\(\)/);
  assert.match(actions, /if \(error \|\| !publishedChapter\) redirect\('\/admin\/learning\?error=chapter_publish'\)/);
  assert.match(actions, /\.eq\('is_published', false\)\.select\('id'\)\.maybeSingle\(\)/);
  assert.match(actions, /if \(error \|\| !publishedLesson\) redirect\('\/admin\/learning\?error=lesson_publish'\)/);
});

test('admin curriculum workspace exposes chapter and lesson review controls', async () => {
  const page = await readFile(new URL('../app/admin/learning/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /Review and publish curriculum/);
  assert.match(page, /Validate and publish chapter/);
  assert.match(page, /Validate and publish lesson/);
});


test('draft lesson editing is admin-only, validates ownership and refuses published lessons', async () => {
  const actions = await readFile(new URL('../app/actions/learning-os.ts', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/admin/learning/page.tsx', import.meta.url), 'utf8');
  assert.match(actions, /async function updateDraftCourseLesson/);
  assert.match(actions, /lesson\.is_published\) redirect\('\/admin\/learning\?error=lesson_locked'\)/);
  assert.match(actions, /\.eq\('course_id', lesson\.course_id\)\.maybeSingle\(\)/);
  assert.match(actions, /\.eq\('is_published', false\)\.select\('id'\)\.maybeSingle\(\)/);
  assert.match(actions, /if \(error \|\| !updatedLesson\) redirect\('\/admin\/learning\?error=lesson_edit'\)/);
  assert.match(page, /Edit draft lesson/);
  assert.match(page, /Save draft changes/);
});

test('published lesson content is not editable through the draft editor', async () => {
  const actions = await readFile(new URL('../app/actions/learning-os.ts', import.meta.url), 'utf8');
  assert.match(actions, /lesson_locked:|lesson_locked/);
  assert.match(actions, /lesson\.is_published/);
  assert.match(actions, /update\(\{[\s\S]*?title, description, content, video_url: videoUrl, chapter_id: chapterId, position/);
});


test('lesson concept mapping validates UUID identifiers and a decimal relevance range', async () => {
  const actions = await readFile(new URL('../app/actions/learning-os.ts', import.meta.url), 'utf8');
  const mapping = actions.slice(actions.indexOf('export async function mapLessonToConcept'));
  assert.match(mapping, /const isUuid = \(value: string\) =>/);
  assert.match(mapping, /!isUuid\(lessonId\) \|\| !isUuid\(conceptId\)/);
  assert.ok(mapping.includes('.test(relevanceRaw)'));
  assert.match(mapping, /relevance <= 0 \|\| relevance > 1/);
  assert.match(mapping, /\.eq\('subject_id', concept\.subject_id\)/);
});


test('published lessons cannot have their curriculum concept mappings changed in place', async () => {
  const actions = await readFile(new URL('../app/actions/learning-os.ts', import.meta.url), 'utf8');
  const mapping = actions.slice(actions.indexOf('export async function mapLessonToConcept'));
  assert.match(mapping, /select\('id,course_id,is_published'\)/);
  assert.match(mapping, /if \(lesson\.is_published\) redirect\('\/admin\/learning\?error=lesson_locked'\)/);
  const page = await readFile(new URL('../app/admin/learning/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /const draftLessons = lessons\.filter\(lesson => !lesson\.is_published\)/);
  assert.match(page, /Published lessons are locked/);
});


test('teacher authoring cannot bypass draft-only curriculum publication gates', async () => {
  const actions = await readFile(new URL('../app/actions/learning.ts', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/teacher/page.tsx', import.meta.url), 'utf8');
  const saveLesson = actions.slice(actions.indexOf('export async function saveLesson'), actions.indexOf('export async function markLessonComplete'));
  const saveChapter = actions.slice(actions.indexOf('export async function saveChapter'), actions.indexOf('export async function getLessonResourceUrl'));
  assert.match(saveLesson, /is_published: false/);
  assert.match(saveLesson, /\.eq\('is_published', false\)\.select\('id'\)\.maybeSingle\(\)/);
  assert.match(saveLesson, /if \(!lesson \|\| lesson\.is_published\)/);
  assert.match(saveLesson, /\.eq\('id', chapterId\)\.eq\('course_id', courseId\)/);
  assert.doesNotMatch(saveLesson, /formData\.get\('published'\)/);
  assert.match(saveChapter, /published: false/);
  assert.match(saveLesson, /profile\?\.is_active !== true/);
  assert.match(saveChapter, /profile\?\.is_active !== true/);
  assert.match(saveLesson, /profile\?\.role !== 'admin' && !assignment/);
  assert.match(saveChapter, /profile\?\.role !== 'admin' && !assignment/);
  assert.doesNotMatch(saveChapter, /formData\.get\('published'\)/);
  assert.doesNotMatch(page, /name="published"/);
  assert.match(page, /Published lesson is locked against in-place editing/);
  assert.match(page, /New lessons are saved as drafts/);
});


test('draft lesson editor enforces bounded fields, HTTPS video URLs and valid ordering', async () => {
  const actions = await readFile(new URL('../app/actions/learning-os.ts', import.meta.url), 'utf8');
  const editor = actions.slice(actions.indexOf('export async function updateDraftCourseLesson'), actions.indexOf('export async function publishCourseChapter'));
  assert.match(editor, /title\.length < 2 \|\| title\.length > 180/);
  assert.match(editor, /description\.length > 4000/);
  assert.match(editor, /content\.length > 30000/);
  assert.match(editor, /videoUrl\.length > 2048 \|\| !\/\^https:/);
  assert.match(editor, /!Number\.isInteger\(position\) \|\| position < 0 \|\| position > 100000/);
  assert.match(editor, /chapterId\)[\s\S]*?\.eq\('course_id', lesson\.course_id\)/);
});

test('draft lesson updates cannot change course ownership and are race-safe against publication', async () => {
  const actions = await readFile(new URL('../app/actions/learning-os.ts', import.meta.url), 'utf8');
  const editor = actions.slice(actions.indexOf('export async function updateDraftCourseLesson'), actions.indexOf('export async function publishCourseChapter'));
  assert.match(editor, /select\('id,course_id,is_published'\)/);
  assert.match(editor, /if \(!lesson \|\| lesson\.is_published\)/);
  assert.match(editor, /\.update\(\{[\s\S]*?title, description, content, video_url: videoUrl, chapter_id: chapterId, position/);
  assert.doesNotMatch(editor, /course_id\s*:/);
  assert.match(editor, /\.eq\('id', lessonId\)\.eq\('is_published', false\)/);
  assert.match(editor, /if \(error \|\| !updatedLesson\)/);
  assert.match(editor, /revalidatePath\('\/learn\/' \+ lesson\.course_id\)/);
});

test('published lessons are omitted from the draft editor and cannot be edited through its form', async () => {
  const page = await readFile(new URL('../app/admin/learning/page.tsx', import.meta.url), 'utf8');
  const lessonList = page.slice(page.indexOf('lessons.filter(lesson => lesson.chapter_id'), page.indexOf('</section>', page.indexOf('lessons.filter(lesson => lesson.chapter_id')));
  assert.match(lessonList, /!lesson\.is_published/);
  assert.match(lessonList, /action=\{updateDraftCourseLesson\}/);
  assert.match(lessonList, /name="lesson_id"/);
  assert.match(lessonList, /Save draft changes/);
});
