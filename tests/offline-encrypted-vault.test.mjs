import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { createEncryptedOfflineVault } from '../lib/offline/encrypted-vault.mjs';

const NOW = Date.parse('2026-11-13T00:00:00.000Z');
const bytes = (value) => new TextEncoder().encode(value);
const hash = (value) => createHash('sha256').update(value).digest('hex');

function fixture() {
  const first = bytes('JMT ');
  const second = bytes('secure lesson content');
  const full = new Uint8Array(first.length + second.length);
  full.set(first);
  full.set(second, first.length);
  return {
    first, second, full,
    manifest: {
      manifestVersion: 1, resourceId: 'lesson-42', resourceVersion: 3,
      resourceType: 'lesson', offlineAllowed: true,
      issuedAt: '2026-11-12T00:00:00.000Z',
      offlineExpiresAt: '2026-11-20T00:00:00.000Z',
      totalBytes: full.length, sha256: hash(full),
      chunks: [
        { id: 'a', size: first.length, sha256: hash(first) },
        { id: 'b', size: second.length, sha256: hash(second) },
      ],
    },
    chunks: [{ id: 'a', bytes: first }, { id: 'b', bytes: second }],
  };
}

function memoryStorage() {
  const keys = new Map();
  const packages = new Map();
  const chunks = new Map();
  return {
    keys, packages, chunks,
    async getKey(userId) { return keys.get(userId) ?? null; },
    async putKey(userId, key) { keys.set(userId, key); },
    async savePackage(record, encrypted) {
      packages.set(record.key, structuredClone(record));
      chunks.set(record.key, structuredClone(encrypted));
    },
    async getPackage(key) { return structuredClone(packages.get(key) ?? null); },
    async listPackages(userId) { return structuredClone([...packages.values()].filter((record) => record.userId === userId)); },
    async getChunks(key) { return structuredClone(chunks.get(key) ?? []); },
    async deletePackage(key) { packages.delete(key); chunks.delete(key); },
    async deleteAccount(userId) {
      keys.delete(userId);
      for (const [key, record] of packages) {
        if (record.userId === userId) { packages.delete(key); chunks.delete(key); }
      }
    },
  };
}

const makeVault = (storage, clock = () => NOW) =>
  createEncryptedOfflineVault({ storage, cryptoProvider: webcrypto, now: clock });

test('stores only authenticated ciphertext and opens a verified package for its account', async () => {
  const storage = memoryStorage();
  const vault = makeVault(storage);
  const f = fixture();
  await vault.savePackage({
    userId: 'student-a', manifest: f.manifest, chunks: f.chunks,
    entitlementExpiresAt: '2026-11-18T00:00:00.000Z',
  });
  const stored = [...storage.chunks.values()][0];
  assert.equal(stored.length, 2);
  assert.equal(stored.some((chunk) => new TextDecoder().decode(new Uint8Array(chunk.ciphertext)).includes('secure lesson')), false);
  assert.equal(storage.keys.get('student-a').extractable, false);

  const opened = await vault.openPackage({
    userId: 'student-a', resourceId: 'lesson-42', resourceVersion: 3,
  });
  assert.equal(opened.ok, true);
  assert.deepEqual(opened.bytes, f.full);
});

test('concurrent first downloads reuse one atomic account key across tabs', async () => {
  const storage = memoryStorage();
  const originalGetKey = storage.getKey.bind(storage);
  let reads = 0;
  let releaseReads;
  const bothReads = new Promise((resolve) => { releaseReads = resolve; });
  storage.getKey = async (userId) => {
    reads += 1;
    if (reads === 2) releaseReads();
    await bothReads;
    return originalGetKey(userId);
  };
  storage.putKey = async (userId, key) => {
    if (storage.keys.has(userId)) throw new Error('ConstraintError');
    storage.keys.set(userId, key);
  };

  const vaultA = makeVault(storage);
  const vaultB = makeVault(storage);
  const f = fixture();
  const manifestB = { ...f.manifest, resourceId: 'lesson-43' };
  await Promise.all([
    vaultA.savePackage({
      userId: 'student-a', manifest: f.manifest, chunks: f.chunks,
      entitlementExpiresAt: '2026-11-18T00:00:00.000Z',
    }),
    vaultB.savePackage({
      userId: 'student-a', manifest: manifestB, chunks: f.chunks,
      entitlementExpiresAt: '2026-11-18T00:00:00.000Z',
    }),
  ]);

  assert.equal(storage.keys.size, 1);
  assert.equal((await vaultA.openPackage({
    userId: 'student-a', resourceId: 'lesson-42', resourceVersion: 3,
  })).ok, true);
  assert.equal((await vaultB.openPackage({
    userId: 'student-a', resourceId: 'lesson-43', resourceVersion: 3,
  })).ok, true);
});

test('does not allow another account to open or remove a package', async () => {
  const storage = memoryStorage();
  const vault = makeVault(storage);
  const f = fixture();
  await vault.savePackage({
    userId: 'student-a', manifest: f.manifest, chunks: f.chunks,
    entitlementExpiresAt: '2026-11-18T00:00:00.000Z',
  });
  const opened = await vault.openPackage({
    userId: 'student-b', resourceId: 'lesson-42', resourceVersion: 3,
  });
  assert.deepEqual(opened, { ok: false, reason: 'package_not_found' });
  assert.equal(await vault.remove({
    userId: 'student-b', resourceId: 'lesson-42', resourceVersion: 3,
  }), false);
});

test('rejects tampered content before storing any bytes', async () => {
  const storage = memoryStorage();
  const vault = makeVault(storage);
  const f = fixture();
  await assert.rejects(vault.savePackage({
    userId: 'student-a', manifest: f.manifest,
    chunks: [{ id: 'a', bytes: bytes('evil') }, f.chunks[1]],
    entitlementExpiresAt: '2026-11-18T00:00:00.000Z',
  }), /Offline package rejected/);
  assert.equal(storage.packages.size, 0);
  assert.equal(storage.chunks.size, 0);
});

test('rejects expired offline or entitlement leases before exposing content', async () => {
  const storage = memoryStorage();
  const vault = makeVault(storage);
  const f = fixture();
  await vault.savePackage({
    userId: 'student-a', manifest: f.manifest, chunks: f.chunks,
    entitlementExpiresAt: '2026-11-18T00:00:00.000Z',
  });
  const expired = makeVault(storage, () => Date.parse('2026-11-19T00:00:00.000Z'));
  assert.deepEqual(await expired.openPackage({
    userId: 'student-a', resourceId: 'lesson-42', resourceVersion: 3,
  }), { ok: false, reason: 'offline_lease_expired' });
});

test('authenticated encryption detects ciphertext or associated-data tampering', async () => {
  const storage = memoryStorage();
  const vault = makeVault(storage);
  const f = fixture();
  await vault.savePackage({
    userId: 'student-a', manifest: f.manifest, chunks: f.chunks,
    entitlementExpiresAt: '2026-11-18T00:00:00.000Z',
  });
  const stored = storage.chunks.get([...storage.packages.keys()][0]);
  stored[0].ciphertext = stored[0].ciphertext.slice(0);
  new Uint8Array(stored[0].ciphertext)[0] ^= 0xff;
  storage.chunks.set([...storage.packages.keys()][0], stored);
  assert.deepEqual(await vault.openPackage({
    userId: 'student-a', resourceId: 'lesson-42', resourceVersion: 3,
  }), { ok: false, reason: 'decryption_failed' });
});

test('account cleanup removes its key, metadata and encrypted chunks only', async () => {
  const storage = memoryStorage();
  const vault = makeVault(storage);
  const f = fixture();
  await vault.savePackage({
    userId: 'student-a', manifest: f.manifest, chunks: f.chunks,
    entitlementExpiresAt: '2026-11-18T00:00:00.000Z',
  });
  await vault.clearAccount('student-a');
  assert.equal(storage.keys.has('student-a'), false);
  assert.equal(storage.packages.size, 0);
  assert.equal(storage.chunks.size, 0);
});

test('does not generate a replacement key when an existing package key is missing', async () => {
  const storage = memoryStorage();
  const vault = makeVault(storage);
  const f = fixture();
  await vault.savePackage({
    userId: 'student-a', manifest: f.manifest, chunks: f.chunks,
    entitlementExpiresAt: '2026-11-18T00:00:00.000Z',
  });
  storage.keys.delete('student-a');

  const opened = await vault.openPackage({
    userId: 'student-a', resourceId: 'lesson-42', resourceVersion: 3,
  });
  assert.deepEqual(opened, { ok: false, reason: 'encryption_key_missing' });
  assert.equal(storage.keys.has('student-a'), false);
  assert.equal(storage.packages.size, 1);
});

test('offline library lists only safe metadata for the requested account', async () => {
  const storage = memoryStorage();
  const vault = makeVault(storage);
  const f = fixture();
  await vault.savePackage({
    userId: 'student-a', manifest: f.manifest, chunks: f.chunks,
    entitlementExpiresAt: '2026-11-18T00:00:00.000Z',
    title: 'Atomic Structure',
  });
  await vault.savePackage({
    userId: 'student-b', manifest: { ...f.manifest, resourceId: 'lesson-43' },
    chunks: f.chunks, entitlementExpiresAt: '2026-11-18T00:00:00.000Z',
    title: 'Other student lesson',
  });

  const listed = await vault.listForUser('student-a');
  assert.equal(listed.length, 1);
  assert.equal(listed[0].title, 'Atomic Structure');
  assert.equal(listed[0].resourceId, 'lesson-42');
  assert.equal('manifest' in listed[0], false);
  assert.equal('bytes' in listed[0], false);
  assert.deepEqual(await vault.listForUser('student-b').then((items) => items.map((item) => item.title)), ['Other student lesson']);
});
