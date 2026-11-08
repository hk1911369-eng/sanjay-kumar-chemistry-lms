import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('published course details are pre-rendered and support on-demand new slugs', async () => {
  const source = await readFile(new URL('../app/courses/[slug]/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /export const revalidate = 300/);
  assert.match(source, /export const dynamicParams = true/);
  assert.match(source, /export async function generateStaticParams/);
  assert.match(source, /is_published', true/);
  assert.match(source, /archived_at', null/);
  assert.match(source, /createPublicClient/);
});
