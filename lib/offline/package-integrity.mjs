import { validateOfflineManifest } from './contracts.mjs';

function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

async function sha256Hex(bytes, cryptoProvider) {
  const digest = await cryptoProvider.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify every downloaded chunk and the final assembled package before callers
 * persist or expose any content. Input bytes remain in memory; this module
 * deliberately does not fetch URLs, write storage, or authorize entitlements.
 *
 * @param {{ manifest: object, chunks: Array<{id: string, bytes: Uint8Array|ArrayBuffer}>, cryptoProvider?: Crypto, now?: number }} options
 * @returns {Promise<{ok: true, bytes: Uint8Array}|{ok: false, reason: string}>}
 */
export async function verifyOfflinePackage({
  manifest,
  chunks,
  cryptoProvider = globalThis.crypto,
  now = Date.now(),
} = {}) {
  const validation = validateOfflineManifest(manifest, { now });
  if (!validation.ok) return { ok: false, reason: validation.reason };
  if (!cryptoProvider?.subtle?.digest) return { ok: false, reason: 'crypto_unavailable' };
  if (!Array.isArray(chunks) || chunks.length !== manifest.chunks.length) {
    return { ok: false, reason: 'chunk_set_mismatch' };
  }

  const supplied = new Map();
  for (const chunk of chunks) {
    if (!chunk || typeof chunk.id !== 'string' || supplied.has(chunk.id)) {
      return { ok: false, reason: 'invalid_or_duplicate_chunk' };
    }
    const bytes = toBytes(chunk.bytes);
    if (!bytes) return { ok: false, reason: 'invalid_chunk_bytes' };
    supplied.set(chunk.id, bytes);
  }

  const ordered = [];
  let totalBytes = 0;
  for (const expected of manifest.chunks) {
    const bytes = supplied.get(expected.id);
    if (!bytes) return { ok: false, reason: 'missing_chunk' };
    if (bytes.byteLength !== expected.size) return { ok: false, reason: 'chunk_size_mismatch' };
    if ((await sha256Hex(bytes, cryptoProvider)) !== expected.sha256.toLowerCase()) {
      return { ok: false, reason: 'chunk_integrity_failed' };
    }
    ordered.push(bytes);
    totalBytes += bytes.byteLength;
  }

  if (totalBytes !== manifest.totalBytes) return { ok: false, reason: 'package_size_mismatch' };
  const assembled = new Uint8Array(totalBytes);
  let offset = 0;
  for (const bytes of ordered) {
    assembled.set(bytes, offset);
    offset += bytes.byteLength;
  }
  if ((await sha256Hex(assembled, cryptoProvider)) !== manifest.sha256.toLowerCase()) {
    return { ok: false, reason: 'package_integrity_failed' };
  }
  return { ok: true, bytes: assembled };
}
