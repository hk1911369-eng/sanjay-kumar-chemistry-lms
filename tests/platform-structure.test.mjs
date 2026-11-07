import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('all authenticated roles use one shared workspace shell', async () => {
  const shell = await read('components/portal-layout.tsx');
  for (const role of ['student', 'teacher', 'staff', 'admin']) {
    assert.match(shell, new RegExp(`\\b${role}:`));
  }
  for (const file of ['app/student/page.tsx','app/admin/page.tsx','app/teacher/page.tsx','app/students/manage/page.tsx','app/learn/[courseId]/page.tsx']) {
    assert.match(await read(file), /PortalLayout/);
  }
});

test('role navigation points to real pages or section anchors', async () => {
  const shell = await read('components/portal-layout.tsx');
  const files = {
    '/student': await read('app/student/page.tsx'),
    '/admin': await read('app/admin/page.tsx'),
    '/teacher': await read('app/teacher/page.tsx'),
  };
  for (const anchor of ['profile','announcements','feedback','courses','payments']) assert.match(files['/student'], new RegExp(`id=["']${anchor}["']`));
  for (const anchor of ['payment-reviews','payment-settings','teacher-assignments','course-configuration']) assert.match(files['/admin'], new RegExp(`id=["']${anchor}["']`));
  for (const anchor of ['assigned-courses','chapter-manager','lesson-creator','lesson-library']) assert.match(files['/teacher'], new RegExp(`id=["']${anchor}["']`));
  assert.match(shell, /href: '\/students\/manage'/);
  assert.match(shell, /href: '\/courses'/);
});
