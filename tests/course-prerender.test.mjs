import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('published course detail pages use on-demand static rendering and revalidation', async () => {
  const source = await readFile(new URL('../app/courses/[slug]/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /export const revalidate = 300/);
  assert.match(source, /export const dynamic = 'force-static'/);
  assert.match(source, /export const dynamicParams = true/);
  assert.match(source, /createPublicClient/);
  assert.doesNotMatch(source, /generateStaticParams/);
});
