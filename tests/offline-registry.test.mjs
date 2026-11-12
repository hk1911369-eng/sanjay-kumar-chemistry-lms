import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createIndexedDbOfflineStorage,
  createOfflineRegistry,
  OFFLINE_REGISTRY_DB,
  OFFLINE_REGISTRY_VERSION,
} from '../lib/offline/registry.mjs';

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

function memoryStorage() {
  const records = new Map();
  return {
    records,
    async put(record) { records.set(record.key, structuredClone(record)); },
    async listByUser(userId) {
      return [...records.values()].filter((record) => record.userId === userId).map(structuredClone);
    },
    async get(key) { return records.has(key) ? structuredClone(records.get(key)) : null; },
    async delete(key) { records.delete(key); },
    async deleteByUser(userId) {
      for (const [key, record] of records) if (record.userId === userId) records.delete(key);
    },
  };
}

function registryFixture() {
  const storage = memoryStorage();
  const registry = createOfflineRegistry({ storage, now: () => NOW });
  return { storage, registry };
}

test('creates the expected versioned IndexedDB schema constants', () => {
  assert.equal(OFFLINE_REGISTRY_DB, 'jmt-offline-registry');
  assert.equal(OFFLINE_REGISTRY_VERSION, 1);
});

test('fails clearly when IndexedDB is unavailable instead of silently pretending to persist', () => {
  assert.throws(
    () => createIndexedDbOfflineStorage({ indexedDB: undefined }),
    /IndexedDB is unavailable/,
  );
});

test('persists only sanitized metadata for an explicitly permitted manifest', async () => {
  const { storage, registry } = registryFixture();
  const source = manifest({
    signedUrl: 'https://private.example/signed?token=secret',
    accessToken: 'must-not-be-stored',
  });
  const record = await registry.save({
    userId: 'student-a',
    manifest: source,
    entitlementExpiresAt: '2026-11-19T00:00:00.000Z',
  });

  assert.equal(record.state, 'queued');
  assert.equal(record.key, 'student-a:lesson-123:3');
  assert.equal(record.manifest.sha256, HASH_A);
  assert.equal('signedUrl' in record.manifest, false);
  assert.equal('accessToken' in record.manifest, false);
  assert.equal(JSON.stringify([...storage.records.values()]).includes('secret'), false);
});

test('rejects a manifest without offline permission before it reaches storage', async () => {
  const { storage, registry } = registryFixture();
  await assert.rejects(
    registry.save({
      userId: 'student-a',
      manifest: manifest({ offlineAllowed: false }),
      entitlementExpiresAt: '2026-11-19T00:00:00.000Z',
    }),
    /offline_not_permitted/,
  );
  assert.equal(storage.records.size, 0);
});

test('rejects expired entitlements and prevents metadata from claiming completion', async () => {
  const { storage, registry } = registryFixture();
  await assert.rejects(
    registry.save({
      userId: 'student-a',
      manifest: manifest(),
      entitlementExpiresAt: '2026-11-12T00:00:00.000Z',
    }),
    /unexpired entitlement/,
  );
  await assert.rejects(
    registry.save({
      userId: 'student-a',
      manifest: manifest(),
      entitlementExpiresAt: '2026-11-19T00:00:00.000Z',
      state: 'complete',
    }),
    /non-complete download metadata states/,
  );
  assert.equal(storage.records.size, 0);
});

test('lists only the requested account packages', async () => {
  const { registry } = registryFixture();
  for (const userId of ['student-a', 'student-b']) {
    await registry.save({
      userId,
      manifest: manifest(),
      entitlementExpiresAt: '2026-11-19T00:00:00.000Z',
    });
  }
  assert.deepEqual((await registry.listForUser('student-a')).map((item) => item.userId), ['student-a']);
  assert.deepEqual(await registry.listForUser(''), []);
});

test('removes only the matching account and content-version package', async () => {
  const { registry } = registryFixture();
  for (const userId of ['student-a', 'student-b']) {
    await registry.save({
      userId,
      manifest: manifest(),
      entitlementExpiresAt: '2026-11-19T00:00:00.000Z',
    });
  }
  assert.equal(await registry.remove({ userId: 'student-a', resourceId: 'lesson-123', resourceVersion: 3 }), true);
  assert.equal(await registry.remove({ userId: 'student-a', resourceId: 'lesson-123', resourceVersion: 3 }), false);
  assert.equal((await registry.listForUser('student-b')).length, 1);
});

test('clears all and only metadata belonging to the signed-out account', async () => {
  const { registry } = registryFixture();
  for (const userId of ['student-a', 'student-b']) {
    await registry.save({
      userId,
      manifest: manifest(),
      entitlementExpiresAt: '2026-11-19T00:00:00.000Z',
    });
  }
  await registry.clearAccount('student-a');
  assert.equal((await registry.listForUser('student-a')).length, 0);
  assert.equal((await registry.listForUser('student-b')).length, 1);
  await assert.rejects(registry.clearAccount(''), /valid authenticated user ID/);
});
