import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('new accounts and password resets require at least 10 characters', async () => {
  const action = await read('app/actions/auth.ts');
  const register = await read('app/register/page.tsx');
  const reset = await read('app/reset-password/page.tsx');

  assert.match(action, /const MIN_PASSWORD_LENGTH = 10/);
  assert.match(action, /password\.length < MIN_PASSWORD_LENGTH/);
  assert.match(register, /name="password"[^>]*minLength=\{10\}/);
  assert.match(register, /At least 10 characters/);
  assert.match(reset, /name="password"[^>]*minLength=\{10\}/);
  assert.match(reset, /At least 10 characters/);
});

test('existing users can still sign in with their current password', async () => {
  const action = await read('app/actions/auth.ts');
  assert.match(action, /if \(!email \|\| password\.length < 8\) redirect\('\/login/);
});
