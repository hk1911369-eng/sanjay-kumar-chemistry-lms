import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, createHash } from 'node:crypto';
import { verifyAndAssembleOfflinePackage } from '../lib/offline/integrity.mjs';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const encoder = new TextEncoder();
const first = encoder.encode('JMT ');
const second = encoder.encode('Academy');
const whole = new Uint8Array(first.length + second.length);
whole.set(first);
whole.set(second, first.length);

function makeManifest(overrides = {}) {
  return {
    totalBytes: whole.length,
    sha256: digest(whole),
    chunks: [
      { id: 'chunk-1', size: first.length, sha256: digest(first) },
      { id: 'chunk-2', size: second.length, sha256: digest(second) },
    ],
    ...overrides,
  };
}

test('verifies every chunk and the assembled package before returning bytes', async () => {
  const result = await verifyAndAssembleOfflinePackage({
    manifest: makeManifest(),
    chunks: [first, second],
    cryptoProvider: webcrypto,
  });
  assert.equal(result.ok, true);
  assert.equal(result.sha256, digest(whole));
  assert.deepEqual(result.bytes, whole);
});

test('rejects a missing or extra chunk', async () => {
  const manifest = makeManifest();
  assert.equal((await verifyAndAssembleOfflinePackage({
    manifest, chunks: [first], cryptoProvider: webcrypto,
  })).reason, 'chunk_count_mismatch');
  assert.equal((await verifyAndAssembleOfflinePackage({
    manifest, chunks: [first, second, second], cryptoProvider: webcrypto,
  })).reason, 'chunk_count_mismatch');
});

test('rejects bytes whose size differs from the signed manifest', async () => {
  const result = await verifyAndAssembleOfflinePackage({
    manifest: makeManifest(),
    chunks: [encoder.encode('short'), second],
    cryptoProvider: webcrypto,
  });
  assert.equal(result.reason, 'chunk_size_mismatch');
});

test('rejects a tampered chunk even if its byte length is unchanged', async () => {
  const tampered = encoder.encode('EVIL');
  const result = await verifyAndAssembleOfflinePackage({
    manifest: makeManifest(),
    chunks: [tampered, second],
    cryptoProvider: webcrypto,
  });
  assert.equal(result.reason, 'chunk_checksum_mismatch');
});

test('rejects a package whose whole-file digest does not match', async () => {
  const result = await verifyAndAssembleOfflinePackage({
    manifest: makeManifest({ sha256: '0'.repeat(64) }),
    chunks: [first, second],
    cryptoProvider: webcrypto,
  });
  assert.equal(result.reason, 'package_checksum_mismatch');
});

test('rejects missing Web Crypto rather than skipping integrity checks', async () => {
  const result = await verifyAndAssembleOfflinePackage({
    manifest: makeManifest(), chunks: [first, second], cryptoProvider: null,
  });
  assert.equal(result.reason, 'web_crypto_unavailable');
});

test('rejects non-byte chunk input', async () => {
  const result = await verifyAndAssembleOfflinePackage({
    manifest: makeManifest(), chunks: ['not bytes', second], cryptoProvider: webcrypto,
  });
  assert.equal(result.reason, 'invalid_chunk_bytes');
});
