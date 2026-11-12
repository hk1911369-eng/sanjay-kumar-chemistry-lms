import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { verifyOfflinePackage } from '../lib/offline/package-integrity.mjs';

const NOW = Date.parse('2026-11-13T00:00:00.000Z');
const bytes = (value) => new TextEncoder().encode(value);
const hash = (value) => createHash('sha256').update(value).digest('hex');

function fixture() {
  const first = bytes('JMT ');
  const second = bytes('offline lesson');
  const assembled = new Uint8Array(first.length + second.length);
  assembled.set(first);
  assembled.set(second, first.length);
  const manifest = {
    manifestVersion: 1,
    resourceId: 'lesson-1',
    resourceVersion: 1,
    resourceType: 'lesson',
    offlineAllowed: true,
    issuedAt: '2026-11-12T00:00:00.000Z',
    offlineExpiresAt: '2026-11-20T00:00:00.000Z',
    totalBytes: assembled.length,
    sha256: hash(assembled),
    chunks: [
      { id: 'part-1', size: first.length, sha256: hash(first) },
      { id: 'part-2', size: second.length, sha256: hash(second) },
    ],
  };
  return { manifest, first, second, assembled };
}

const verify = (options) => verifyOfflinePackage({ ...options, cryptoProvider: webcrypto, now: NOW });

test('verifies chunk digests and the assembled package independent of arrival order', async () => {
  const f = fixture();
  const result = await verify({
    manifest: f.manifest,
    chunks: [{ id: 'part-2', bytes: f.second }, { id: 'part-1', bytes: f.first }],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.bytes, f.assembled);
});

test('rejects a tampered chunk even when its byte length is unchanged', async () => {
  const f = fixture();
  const altered = bytes('JMT?');
  const result = await verify({
    manifest: f.manifest,
    chunks: [{ id: 'part-1', bytes: altered }, { id: 'part-2', bytes: f.second }],
  });
  assert.deepEqual(result, { ok: false, reason: 'chunk_integrity_failed' });
});

test('rejects a package whose chunks do not match the package-level digest', async () => {
  const f = fixture();
  const alteredManifest = {
    ...f.manifest,
    chunks: f.manifest.chunks.map((chunk) => ({ ...chunk })),
    sha256: 'f'.repeat(64),
  };
  const result = await verify({
    manifest: alteredManifest,
    chunks: [{ id: 'part-1', bytes: f.first }, { id: 'part-2', bytes: f.second }],
  });
  assert.deepEqual(result, { ok: false, reason: 'package_integrity_failed' });
});

test('rejects missing, extra and duplicate chunks', async () => {
  const f = fixture();
  assert.equal((await verify({ manifest: f.manifest, chunks: [{ id: 'part-1', bytes: f.first }] })).reason, 'chunk_set_mismatch');
  assert.equal((await verify({ manifest: f.manifest, chunks: [
    { id: 'part-1', bytes: f.first }, { id: 'part-2', bytes: f.second }, { id: 'extra', bytes: bytes('x') },
  ] })).reason, 'chunk_set_mismatch');
  assert.equal((await verify({ manifest: f.manifest, chunks: [
    { id: 'part-1', bytes: f.first }, { id: 'part-1', bytes: f.second },
  ] })).reason, 'invalid_or_duplicate_chunk');
});

test('rejects wrong chunk lengths and non-byte input', async () => {
  const f = fixture();
  assert.equal((await verify({ manifest: f.manifest, chunks: [
    { id: 'part-1', bytes: bytes('short') }, { id: 'part-2', bytes: f.second },
  ] })).reason, 'chunk_size_mismatch');
  assert.equal((await verify({ manifest: f.manifest, chunks: [
    { id: 'part-1', bytes: 'not bytes' }, { id: 'part-2', bytes: f.second },
  ] })).reason, 'invalid_chunk_bytes');
});

test('fails closed when the manifest has expired or crypto is unavailable', async () => {
  const f = fixture();
  assert.equal((await verify({
    manifest: { ...f.manifest, offlineExpiresAt: '2026-11-12T00:00:00.000Z' },
    chunks: [],
  })).reason, 'manifest_expired_or_invalid');
  assert.equal((await verifyOfflinePackage({
    manifest: f.manifest,
    chunks: [{ id: 'part-1', bytes: f.first }, { id: 'part-2', bytes: f.second }],
    cryptoProvider: null,
    now: NOW,
  })).reason, 'crypto_unavailable');
});
