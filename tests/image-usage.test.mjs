import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('remaining profile, course and lesson previews use Next Image with dimensions', async () => {
  for (const path of [
    'app/admin/courses/page.tsx',
    'app/student/page.tsx',
    'app/students/manage/page.tsx',
    'components/lesson-resource-access.tsx',
  ]) {
    const source = await readFile(new URL('../' + path, import.meta.url), 'utf8');
    assert.match(source, /from 'next\/image'/, path);
    assert.match(source, /<Image\b/, path);
    assert.doesNotMatch(source, /<img\b/, path);
    assert.match(source, /width=\{/);
    assert.match(source, /height=\{/);
  }
});
