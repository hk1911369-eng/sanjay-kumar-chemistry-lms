import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getClientIp } = require('../lib/client-ip.js');

function withCloudflareTrust(value, run) {
  const previous = process.env.TRUST_CLOUDFLARE_IP_HEADER;
  if (value === undefined) delete process.env.TRUST_CLOUDFLARE_IP_HEADER;
  else process.env.TRUST_CLOUDFLARE_IP_HEADER = value;
  try { run(); }
  finally {
    if (previous === undefined) delete process.env.TRUST_CLOUDFLARE_IP_HEADER;
    else process.env.TRUST_CLOUDFLARE_IP_HEADER = previous;
  }
}

test('ignores a caller-supplied Cloudflare header unless the deployment explicitly trusts it', () => {
  withCloudflareTrust(undefined, () => {
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.99',
      'x-forwarded-for': '198.51.100.10, 192.0.2.20',
    });
    assert.equal(getClientIp(headers), '192.0.2.20');
  });
});

test('uses the proxy-appended right-most valid forwarded address', () => {
  withCloudflareTrust(undefined, () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.77, not-an-ip, 198.51.100.25',
    });
    assert.equal(getClientIp(headers), '198.51.100.25');
  });
});

test('uses Cloudflare connecting IP only when explicitly enabled for a trusted edge', () => {
  withCloudflareTrust('true', () => {
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.99',
      'x-forwarded-for': '198.51.100.10, 192.0.2.20',
    });
    assert.equal(getClientIp(headers), '203.0.113.99');
  });
});

test('does not trust x-real-ip when no trusted forwarded address exists', () => {
  withCloudflareTrust(undefined, () => {
    const headers = new Headers({
      'cf-connecting-ip': 'not-an-ip',
      'x-real-ip': '203.0.113.8',
    });
    assert.equal(getClientIp(headers), 'unknown');
  });
});
