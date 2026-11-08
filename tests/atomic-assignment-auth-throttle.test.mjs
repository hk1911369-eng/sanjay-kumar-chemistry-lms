import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getClientIp } from '../lib/client-ip.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('course assignment replacement uses one transactional RPC, not delete-then-insert actions', async () => {
  const action = await read('app/actions/course-studio.ts');
  const migration = await read('supabase/migrations/0038_atomic_course_assignments_and_password_reset_limit.sql');
  assert.match(action, /replace_course_assignments/);
  assert.doesNotMatch(action, /from\('course_assignments'\)\.delete\(\)/);
  assert.match(migration, /create or replace function public\.replace_course_assignments/);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /on conflict \(course_id, teacher_id\) do nothing/i);
});

test('password reset requests use the same generic response and a database throttle', async () => {
  const action = await read('app/actions/auth.ts');
  const limiter = await read('lib/auth-rate-limit.ts');
  const migration = await read('supabase/migrations/0038_atomic_course_assignments_and_password_reset_limit.sql');
  assert.match(action, /enforceAuthRateLimit\('password_reset'/);
  assert.match(action, /forgot-password\?sent=1/);
  assert.match(limiter, /password_reset/);
  assert.match(migration, /p_action = 'password_reset'/);
});

test('client IP extraction ignores a spoofed left-most forwarded address', () => {
  const headers = new Map([
    ['x-forwarded-for', '203.0.113.99, 198.51.100.10'],
    ['x-real-ip', '192.0.2.1'],
  ]);
  assert.equal(getClientIp({ get: name => headers.get(name) ?? null }), '198.51.100.10');
  assert.equal(getClientIp({ get: name => name === 'x-forwarded-for' ? 'not-an-ip, 198.51.100.20' : null }), '198.51.100.20');
  assert.equal(getClientIp({ get: name => name === 'cf-connecting-ip' ? '2001:db8::1' : '203.0.113.1' }), '2001:db8::1');
});

test('payment review never sends a database error message to the URL', async () => {
  const action = await read('app/actions/payments.ts');
  const helper = await read('lib/payment-review-error.js');
  assert.match(action, /paymentReviewErrorCode\(error\)/);
  assert.doesNotMatch(action, /error\.message\.slice/);
  assert.match(helper, /return 'failed'/);
});
