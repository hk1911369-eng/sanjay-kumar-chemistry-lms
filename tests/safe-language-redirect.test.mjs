import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('language return path validation rejects backslash-based external URLs', async () => {
  const action = await readFile(new URL('../app/actions/language.ts', import.meta.url), 'utf8');
  const base = 'https://jmt-academy.invalid';
  assert.equal(new URL('/student?tab=profile', base).origin, base);
  assert.notEqual(new URL('/\\\\evil.example', base).origin, base);
  assert.match(action, /new URL\(back, 'https:\/\/jmt-academy\.invalid'\)/);
  assert.match(action, /target\.origin === 'https:\/\/jmt-academy\.invalid'/);
  assert.match(action, /redirect\(destination\)/);
});
