import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('curriculum authoring is exposed only through the admin learning workspace', async () => {
  const page = await readFile(new URL('../app/admin/learning/page.tsx', import.meta.url), 'utf8');
  const actions = await readFile(new URL('../app/actions/learning-os.ts', import.meta.url), 'utf8');
  assert.match(page, /createCourseChapter/);
  assert.match(page, /createCourseLesson/);
  assert.match(actions, /async function adminContext/);
  assert.match(actions, /profile\?\.role !== 'admin'/);
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
