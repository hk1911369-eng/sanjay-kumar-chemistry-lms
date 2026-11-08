import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public homepage presents the academy as multi-subject rather than fixed chemistry cohorts', async () => {
  const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes('School & secondary'));
  assert.ok(page.includes('Higher secondary'));
  assert.ok(page.includes('Admission, university & skills'));
  assert.equal(/HSC 2027|HSC 2028|Admission Batch/.test(page), false);
  assert.ok(page.includes('(c.subjects??[]).join'));
});
