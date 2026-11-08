import test from 'node:test';
import assert from 'node:assert/strict';
import { getClientIp } from '../lib/client-ip.js';

function headers(values = {}) {
  const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return { get(name) { return normalized[name.toLowerCase()] ?? null; } };
}

test('rate limiting uses the right-most proxy-observed address, not caller-supplied XFF values', () => {
  assert.equal(
    getClientIp(headers({ 'x-forwarded-for': '203.0.113.10, 198.51.100.25' })),
    '198.51.100.25',
  );
});

test('does not trust caller-supplied Cloudflare header on the Render deployment', () => {
  assert.equal(
    getClientIp(headers({
      'cf-connecting-ip': '203.0.113.77',
      'x-forwarded-for': '203.0.113.10, 198.51.100.25',
    })),
    '198.51.100.25',
  );
  assert.equal(
    getClientIp(headers({ 'cf-connecting-ip': '203.0.113.77' })),
    'unknown',
  );
});

test('supports IPv6 and falls back to a valid proxy real-ip header', () => {
  assert.equal(getClientIp(headers({ 'x-forwarded-for': '2001:db8::1' })), '2001:db8::1');
  assert.equal(getClientIp(headers({ 'x-real-ip': '192.0.2.8' })), '192.0.2.8');
});

test('ignores invalid forwarded values and returns unknown when no trusted address exists', () => {
  assert.equal(getClientIp(headers({ 'x-forwarded-for': 'not-an-ip, also-invalid' })), 'unknown');
});
