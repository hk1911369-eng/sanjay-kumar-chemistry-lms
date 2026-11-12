import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canOpenOfflinePackage,
  canTransitionDownload,
  createOfflinePackageKey,
  transitionDownloadState,
  validateOfflineManifest,
} from '../lib/offline/contracts.mjs';

const NOW = Date.parse('2026-11-13T00:00:00.000Z');
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function manifest(overrides = {}) {
  return {
    manifestVersion: 1,
    resourceId: 'lesson-123',
    resourceVersion: 3,
    resourceType: 'lesson',
    offlineAllowed: true,
    issuedAt: '2026-11-12T00:00:00.000Z',
    offlineExpiresAt: '2026-11-20T00:00:00.000Z',
    totalBytes: 12,
    sha256: HASH_A,
    chunks: [
      { id: 'part-1', size: 5, sha256: HASH_A },
      { id: 'part-2', size: 7, sha256: HASH_B },
    ],
    ...overrides,
  };
}

test('accepts a complete, explicitly permitted and internally consistent manifest', () => {
  assert.deepEqual(validateOfflineManifest(manifest(), { now: NOW }), { ok: true, reason: null });
});

test('rejects missing or malformed manifest data', () => {
  assert.equal(validateOfflineManifest(null, { now: NOW }).reason, 'invalid_manifest');
  assert.equal(validateOfflineManifest([], { now: NOW }).reason, 'invalid_manifest');
});

test('rejects unsupported manifest versions and resource types', () => {
  assert.equal(validateOfflineManifest(manifest({ manifestVersion: 2 }), { now: NOW }).reason, 'unsupported_manifest_version');
  assert.equal(validateOfflineManifest(manifest({ resourceType: 'exam_answer_key' }), { now: NOW }).reason, 'unsupported_resource_type');
});

test('rejects content unless the server explicitly permits offline use', () => {
  assert.equal(validateOfflineManifest(manifest({ offlineAllowed: false }), { now: NOW }).reason, 'offline_not_permitted');
  assert.equal(validateOfflineManifest(manifest({ offlineAllowed: 'true' }), { now: NOW }).reason, 'offline_not_permitted');
});

test('rejects invalid resource identity and version', () => {
  assert.equal(validateOfflineManifest(manifest({ resourceId: ' ' }), { now: NOW }).reason, 'invalid_resource_id');
  assert.equal(validateOfflineManifest(manifest({ resourceVersion: 0 }), { now: NOW }).reason, 'invalid_resource_version');
});

test('rejects a future-issued manifest outside the allowed clock-skew tolerance', () => {
  assert.equal(
    validateOfflineManifest(manifest({ issuedAt: '2026-11-13T00:06:00.000Z' }), { now: NOW }).reason,
    'invalid_issued_at',
  );
});

test('rejects expired, invalid or non-forward offline leases', () => {
  assert.equal(
    validateOfflineManifest(manifest({ offlineExpiresAt: '2026-11-12T00:00:00.000Z' }), { now: NOW }).reason,
    'manifest_expired_or_invalid',
  );
  assert.equal(
    validateOfflineManifest(manifest({ offlineExpiresAt: 'not-a-date' }), { now: NOW }).reason,
    'manifest_expired_or_invalid',
  );
});

test('rejects package sizes outside the safe storage limit', () => {
  assert.equal(validateOfflineManifest(manifest({ totalBytes: 0 }), { now: NOW }).reason, 'invalid_package_size');
  assert.equal(
    validateOfflineManifest(manifest({ totalBytes: 100 * 1024 * 1024 + 1 }), { now: NOW }).reason,
    'invalid_package_size',
  );
});

test('rejects malformed checksums before any package can be trusted', () => {
  assert.equal(validateOfflineManifest(manifest({ sha256: 'abc' }), { now: NOW }).reason, 'invalid_package_checksum');
  assert.equal(
    validateOfflineManifest(manifest({ chunks: [{ id: 'part-1', size: 12, sha256: 'bad' }] }), { now: NOW }).reason,
    'invalid_chunk_checksum',
  );
});

test('rejects duplicate chunk IDs and mismatched byte totals', () => {
  assert.equal(
    validateOfflineManifest(manifest({ chunks: [
      { id: 'same', size: 6, sha256: HASH_A },
      { id: 'same', size: 6, sha256: HASH_B },
    ] }), { now: NOW }).reason,
    'invalid_or_duplicate_chunk_id',
  );
  assert.equal(
    validateOfflineManifest(manifest({ chunks: [{ id: 'part-1', size: 11, sha256: HASH_A }] }), { now: NOW }).reason,
    'chunk_size_mismatch',
  );
});

test('creates stable account- and version-scoped keys without conflating learners', () => {
  const first = createOfflinePackageKey({ userId: 'student-a', resourceId: 'lesson-1', resourceVersion: 1 });
  const second = createOfflinePackageKey({ userId: 'student-b', resourceId: 'lesson-1', resourceVersion: 1 });
  const updated = createOfflinePackageKey({ userId: 'student-a', resourceId: 'lesson-1', resourceVersion: 2 });
  assert.notEqual(first, second);
  assert.notEqual(first, updated);
  assert.equal(first, 'student-a:lesson-1:1');
});

test('rejects malformed account-scoped key inputs', () => {
  assert.throws(() => createOfflinePackageKey({ userId: '', resourceId: 'lesson-1', resourceVersion: 1 }), TypeError);
  assert.throws(() => createOfflinePackageKey({ userId: 'student-a', resourceId: 'lesson-1', resourceVersion: 0 }), TypeError);
});

test('offline access requires the same authenticated account and a verified complete package', () => {
  const packageRecord = {
    userId: 'student-a',
    state: 'complete',
    checksumVerified: true,
    entitlementExpiresAt: '2026-11-19T00:00:00.000Z',
    manifest: manifest(),
  };
  assert.equal(canOpenOfflinePackage({ packageRecord, currentUserId: 'student-a', now: NOW }), true);
  assert.equal(canOpenOfflinePackage({ packageRecord, currentUserId: 'student-b', now: NOW }), false);
  assert.equal(canOpenOfflinePackage({ packageRecord: { ...packageRecord, checksumVerified: false }, currentUserId: 'student-a', now: NOW }), false);
  assert.equal(canOpenOfflinePackage({ packageRecord: { ...packageRecord, state: 'downloading' }, currentUserId: 'student-a', now: NOW }), false);
});

test('offline access fails closed after either offline or entitlement lease expiry', () => {
  const base = {
    userId: 'student-a',
    state: 'complete',
    checksumVerified: true,
    entitlementExpiresAt: '2026-11-19T00:00:00.000Z',
    manifest: manifest(),
  };
  assert.equal(canOpenOfflinePackage({ packageRecord: base, currentUserId: 'student-a', now: NOW }), true);
  assert.equal(canOpenOfflinePackage({ packageRecord: base, currentUserId: 'student-a', now: Date.parse('2026-11-21T00:00:00.000Z') }), false);
  assert.equal(canOpenOfflinePackage({
    packageRecord: { ...base, entitlementExpiresAt: '2026-11-12T00:00:00.000Z' },
    currentUserId: 'student-a',
    now: NOW,
  }), false);
});

test('download state machine allows only explicit safe transitions', () => {
  assert.equal(canTransitionDownload('queued', 'downloading'), true);
  assert.equal(canTransitionDownload('downloading', 'verifying'), true);
  assert.equal(canTransitionDownload('verifying', 'complete'), true);
  assert.equal(canTransitionDownload('failed', 'queued'), true);
  assert.equal(canTransitionDownload('complete', 'downloading'), false);
  assert.equal(canTransitionDownload('cancelled', 'downloading'), false);
  assert.throws(() => transitionDownloadState('complete', 'downloading'), /Invalid offline download transition/);
});
