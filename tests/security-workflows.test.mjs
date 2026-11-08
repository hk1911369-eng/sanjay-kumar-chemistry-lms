import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { paymentReviewErrorCode } = require('../lib/payment-review-error.js');

test('course assignment replacement is one validated database RPC', async () => {
  const action = await readFile(new URL('../app/actions/course-studio.ts', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20261108091524_0038_atomic_course_assignments_and_password_reset_limit.sql', import.meta.url), 'utf8');
  assert.match(action, /rpc\(['"]replace_course_assignments['"]/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.replace_course_assignments/);
  assert.match(migration, /Every assigned account must be a Teacher or Staff member/);
  assert.match(migration, /DELETE FROM public\.course_assignments/);
  assert.match(migration, /INSERT INTO public\.course_assignments/);
  assert.doesNotMatch(action, /from\(['"]course_assignments['"]\)\.delete/);
});

test('password reset is rate-limited and always uses the same public response', async () => {
  const action = await readFile(new URL('../app/actions/auth.ts', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20261108091524_0038_atomic_course_assignments_and_password_reset_limit.sql', import.meta.url), 'utf8');
  assert.match(action, /enforceAuthRateLimit\(['"]password_reset['"]/);
  assert.match(action, /resetPasswordForEmail/);
  assert.match(action, /forgot-password\?sent=1/);
  assert.match(migration, /password_reset/);
});

test('payment review exposes stable error codes, never database messages', async () => {
  assert.equal(paymentReviewErrorCode({ code: '42501' }), 'forbidden');
  assert.equal(paymentReviewErrorCode({ code: 'P0002' }), 'not_found');
  assert.equal(paymentReviewErrorCode({ code: '23505' }), 'duplicate');
  assert.equal(paymentReviewErrorCode({ code: 'XX000', message: 'internal SQL detail' }), 'failed');

  const action = await readFile(new URL('../app/actions/payments.ts', import.meta.url), 'utf8');
  assert.match(action, /paymentReviewErrorCode\(error\)/);
  assert.doesNotMatch(action, /review_error=\$\{encodeURIComponent\(error\.message\)\}/);
});
