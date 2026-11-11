'use strict';
const { isIP } = require('node:net');

function validIp(value) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return isIP(candidate) ? candidate : null;
}

exports.getClientIp = function getClientIp(requestHeaders) {
  // This service runs behind Render, not a trusted Cloudflare-only edge.
  // A caller can supply cf-connecting-ip, so do not use it for rate-limit keys.

  // The hosting proxy appends the address it observed to X-Forwarded-For.
  // Walk from the right so caller-supplied left-most values cannot rotate the
  // per-IP rate-limit bucket.
  const forwarded = requestHeaders.get('x-forwarded-for');
  if (forwarded) {
    const chain = forwarded.split(',').map(value => value.trim()).filter(Boolean);
    for (let index = chain.length - 1; index >= 0; index -= 1) {
      const candidate = validIp(chain[index]);
      if (candidate) return candidate;
    }
  }

  return validIp(requestHeaders.get('x-real-ip')) || 'unknown';
};
