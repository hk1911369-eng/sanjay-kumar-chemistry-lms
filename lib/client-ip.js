'use strict';
const { isIP } = require('node:net');

function validIp(value) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return isIP(candidate) ? candidate : null;
}

exports.getClientIp = function getClientIp(requestHeaders) {
  // Cloudflare overwrites this header at its edge; prefer it when present.
  const cloudflare = validIp(requestHeaders.get('cf-connecting-ip'));
  if (cloudflare) return cloudflare;

  // Proxies append their observed client address to X-Forwarded-For.
  // Never trust the left-most value: it may have been supplied by the caller.
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
