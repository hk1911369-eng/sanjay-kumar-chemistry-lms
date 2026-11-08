'use strict';
const { isIP } = require('node:net');

function validIp(value) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return isIP(candidate) ? candidate : null;
}

exports.getClientIp = function getClientIp(requestHeaders) {
  // Trust Cloudflare's edge header only when deployment configuration explicitly
  // guarantees that requests cannot bypass Cloudflare and the edge overwrites it.
  if (process.env.TRUST_CLOUDFLARE_IP_HEADER === 'true') {
    const cloudflare = validIp(requestHeaders.get('cf-connecting-ip'));
    if (cloudflare) return cloudflare;
  }

  // On Render, use the right-most proxy-appended address. Never trust the
  // left-most X-Forwarded-For entry because callers can supply that value.
  const forwarded = requestHeaders.get('x-forwarded-for');
  if (forwarded) {
    const chain = forwarded.split(',').map(value => value.trim()).filter(Boolean);
    for (let index = chain.length - 1; index >= 0; index -= 1) {
      const candidate = validIp(chain[index]);
      if (candidate) return candidate;
    }
  }

  // Do not fall back to x-real-ip: it is not guaranteed to be overwritten
  // by the current Render ingress path.
  return 'unknown';
};
