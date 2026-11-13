import { canOpenOfflinePackage, createOfflinePackageKey, validateOfflineManifest } from './contracts.mjs';
import { verifyOfflinePackage } from './package-integrity.mjs';

export const OFFLINE_VAULT_DB = 'jmt-offline-content-vault';
export const OFFLINE_VAULT_DB_VERSION = 2;
const KEY_STORE = 'account_keys';
const PACKAGE_STORE = 'packages';
const CHUNK_STORE = 'encrypted_chunks';
const encoder = new TextEncoder();

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
  });
}

function packageKeyFor(userId, manifest) {
  return createOfflinePackageKey({
    userId,
    resourceId: manifest.resourceId,
    resourceVersion: manifest.resourceVersion,
  });
}

function chunkAad({ userId, resourceId, resourceVersion, chunkId }) {
  return encoder.encode(JSON.stringify([userId, resourceId, resourceVersion, chunkId]));
}

function asArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** IndexedDB adapter. CryptoKey records rely on browser structured-clone support. */
export function createIndexedDbOfflineVaultStorage({
  indexedDB = globalThis.indexedDB,
  databaseName = OFFLINE_VAULT_DB,
} = {}) {
  if (!indexedDB || typeof indexedDB.open !== 'function') {
    throw new Error('IndexedDB is unavailable in this browser');
  }
  let dbPromise;
  function database() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, OFFLINE_VAULT_DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE, { keyPath: 'userId' });
          if (!db.objectStoreNames.contains(PACKAGE_STORE)) {
            const store = db.createObjectStore(PACKAGE_STORE, { keyPath: 'key' });
            store.createIndex('by_user', 'userId', { unique: false });
          } else {
            const store = request.transaction.objectStore(PACKAGE_STORE);
            if (!store.indexNames.contains('by_user')) store.createIndex('by_user', 'userId', { unique: false });
          }
          if (!db.objectStoreNames.contains(CHUNK_STORE)) {
            const store = db.createObjectStore(CHUNK_STORE, { keyPath: 'id' });
            store.createIndex('by_package', 'packageKey', { unique: false });
            store.createIndex('by_user', 'userId', { unique: false });
          }
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => request.result.close();
          resolve(request.result);
        };
        request.onerror = () => reject(request.error || new Error('Unable to open offline content vault'));
        request.onblocked = () => reject(new Error('Offline vault upgrade is blocked by another tab'));
      }).catch((error) => {
        dbPromise = undefined;
        throw error;
      });
    }
    return dbPromise;
  }

  return {
    async getKey(userId) {
      const db = await database();
      const tx = db.transaction(KEY_STORE, 'readonly');
      const done = transactionDone(tx);
      const result = await requestValue(tx.objectStore(KEY_STORE).get(userId));
      await done;
      return result?.cryptoKey ?? null;
    },
    async putKey(userId, cryptoKey) {
      const db = await database();
      const tx = db.transaction(KEY_STORE, 'readwrite');
      const done = transactionDone(tx);
      tx.objectStore(KEY_STORE).put({ userId, cryptoKey, createdAt: new Date().toISOString() });
      await done;
    },
    async savePackage(record, chunks) {
      const db = await database();
      const tx = db.transaction([PACKAGE_STORE, CHUNK_STORE], 'readwrite');
      const done = transactionDone(tx);
      tx.objectStore(PACKAGE_STORE).put(record);
      const store = tx.objectStore(CHUNK_STORE);
      const existing = store.index('by_package').openCursor(record.key);
      existing.onsuccess = () => {
        const cursor = existing.result;
        if (!cursor) {
          for (const chunk of chunks) store.put(chunk);
          return;
        }
        cursor.delete();
        cursor.continue();
      };
      existing.onerror = () => tx.abort();
      await done;
    },
    async getPackage(key) {
      const db = await database();
      const tx = db.transaction(PACKAGE_STORE, 'readonly');
      const done = transactionDone(tx);
      const result = await requestValue(tx.objectStore(PACKAGE_STORE).get(key));
      await done;
      return result ?? null;
    },
    async listPackages(userId) {
      const db = await database();
      const tx = db.transaction(PACKAGE_STORE, 'readonly');
      const done = transactionDone(tx);
      const result = await requestValue(tx.objectStore(PACKAGE_STORE).index('by_user').getAll(userId));
      await done;
      return result;
    },
    async getChunks(packageKey) {
      const db = await database();
      const tx = db.transaction(CHUNK_STORE, 'readonly');
      const done = transactionDone(tx);
      const result = await requestValue(tx.objectStore(CHUNK_STORE).index('by_package').getAll(packageKey));
      await done;
      return result;
    },
    async deletePackage(packageKey) {
      const db = await database();
      const tx = db.transaction([PACKAGE_STORE, CHUNK_STORE], 'readwrite');
      const done = transactionDone(tx);
      tx.objectStore(PACKAGE_STORE).delete(packageKey);
      const request = tx.objectStore(CHUNK_STORE).index('by_package').openCursor(packageKey);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      request.onerror = () => tx.abort();
      await done;
    },
    async deleteAccount(userId) {
      const db = await database();
      const tx = db.transaction([KEY_STORE, PACKAGE_STORE, CHUNK_STORE], 'readwrite');
      const done = transactionDone(tx);
      tx.objectStore(KEY_STORE).delete(userId);
      const packageStore = tx.objectStore(PACKAGE_STORE);
      const packageRequest = packageStore.openCursor();
      packageRequest.onsuccess = () => {
        const cursor = packageRequest.result;
        if (!cursor) return;
        if (cursor.value.userId === userId) cursor.delete();
        cursor.continue();
      };
      const chunkRequest = tx.objectStore(CHUNK_STORE).index('by_user').openCursor(userId);
      chunkRequest.onsuccess = () => {
        const cursor = chunkRequest.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      packageRequest.onerror = () => tx.abort();
      chunkRequest.onerror = () => tx.abort();
      await done;
    },
  };
}

/**
 * Encrypted offline content vault. The authenticated caller must obtain the
 * manifest and entitlement lease from the server before calling savePackage.
 * This module does not fetch URLs or establish server authorization.
 * @param {{ storage: {
 *   getKey: (userId: string) => Promise<CryptoKey|null>,
 *   putKey: (userId: string, key: CryptoKey) => Promise<void>,
 *   savePackage: (record: object, chunks: object[]) => Promise<void>,
 *   getPackage: (key: string) => Promise<object|null>,
 *   listPackages: (userId: string) => Promise<object[]>,
 *   getChunks: (key: string) => Promise<object[]>,
 *   deletePackage: (key: string) => Promise<void>,
 *   deleteAccount: (userId: string) => Promise<void>
 * }, cryptoProvider?: Crypto, now?: () => number }} options
 */
export function createEncryptedOfflineVault({
  storage,
  cryptoProvider = globalThis.crypto,
  now = () => Date.now(),
} = {}) {
  if (!storage || !['getKey', 'putKey', 'savePackage', 'getPackage', 'listPackages', 'getChunks', 'deletePackage', 'deleteAccount']
    .every((method) => typeof storage[method] === 'function')) {
    throw new TypeError('A complete offline vault storage adapter is required');
  }

  async function accountKey(userId) {
    if (!cryptoProvider?.subtle) throw new Error('Web Crypto is unavailable');
    let key = await storage.getKey(userId);
    if (key) {
      if (key.type !== 'secret' || key.extractable || !key.usages.includes('encrypt') || !key.usages.includes('decrypt')) {
        throw new Error('Stored offline encryption key is invalid');
      }
      return key;
    }
    key = await cryptoProvider.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await storage.putKey(userId, key);
    return key;
  }

  // Opening is read-only: a missing key must never be silently replaced,
  // because a newly generated key cannot decrypt previously stored content.
  async function existingAccountKey(userId) {
    if (!cryptoProvider?.subtle) return { ok: false, reason: 'crypto_unavailable' };
    const key = await storage.getKey(userId);
    if (!key) return { ok: false, reason: 'encryption_key_missing' };
    if (key.type !== 'secret' || key.extractable ||
        !key.usages.includes('encrypt') || !key.usages.includes('decrypt')) {
      return { ok: false, reason: 'encryption_key_invalid' };
    }
    return { ok: true, key };
  }

  return {
    async savePackage({ userId, manifest, chunks, entitlementExpiresAt, title }) {
      if (typeof userId !== 'string' || !userId.trim() || userId.length > 128) {
        throw new TypeError('A valid authenticated account is required');
      }
      const timestamp = now();
      const validation = validateOfflineManifest(manifest, { now: timestamp });
      if (!validation.ok) throw new TypeError(`Offline manifest rejected: ${validation.reason}`);
      const entitlementExpiry = Date.parse(entitlementExpiresAt);
      if (!Number.isFinite(entitlementExpiry) || entitlementExpiry <= timestamp) {
        throw new TypeError('A valid, unexpired entitlement lease is required');
      }
      const verified = await verifyOfflinePackage({ manifest, chunks, cryptoProvider, now: timestamp });
      if (!verified.ok) throw new TypeError(`Offline package rejected: ${verified.reason}`);

      const key = await accountKey(userId);
      const packageKey = packageKeyFor(userId, manifest);
      const encryptedChunks = [];
      for (const expected of manifest.chunks) {
        const plain = chunks.find((chunk) => chunk.id === expected.id).bytes;
        const nonce = cryptoProvider.getRandomValues(new Uint8Array(12));
        const aad = chunkAad({
          userId, resourceId: manifest.resourceId,
          resourceVersion: manifest.resourceVersion, chunkId: expected.id,
        });
        const ciphertext = await cryptoProvider.subtle.encrypt(
          { name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 },
          key,
          plain,
        );
        encryptedChunks.push({
          id: `${packageKey}:${expected.id}`, packageKey, userId,
          resourceId: manifest.resourceId, resourceVersion: manifest.resourceVersion,
          chunkId: expected.id, nonce, ciphertext,
        });
      }
      const record = {
        key: packageKey, userId, resourceId: manifest.resourceId,
        resourceVersion: manifest.resourceVersion, state: 'complete',
        title: typeof title === 'string' ? title.trim().slice(0, 200) : '',
        manifest, entitlementExpiresAt,
        savedAt: new Date(timestamp).toISOString(),
      };
      await storage.savePackage(record, encryptedChunks);
      return { key: packageKey, resourceId: manifest.resourceId, resourceVersion: manifest.resourceVersion };
    },

    async listForUser(userId) {
      if (typeof userId !== 'string' || !userId.trim() || userId.length > 128) return [];
      const records = await storage.listPackages(userId);
      return records
        .filter((record) => record && record.userId === userId &&
          typeof record.resourceId === 'string' &&
          Number.isSafeInteger(record.resourceVersion) &&
          record.manifest?.resourceType === 'lesson')
        .map((record) => ({
          key: record.key,
          userId: record.userId,
          resourceId: record.resourceId,
          resourceVersion: record.resourceVersion,
          title: typeof record.title === 'string' && record.title.trim()
            ? record.title.trim().slice(0, 200)
            : 'Downloaded lesson',
          savedAt: record.savedAt,
          entitlementExpiresAt: record.entitlementExpiresAt,
          offlineExpiresAt: record.manifest.offlineExpiresAt,
          totalBytes: record.manifest.totalBytes,
        }))
        .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
    },

    async openPackage({ userId, resourceId, resourceVersion }) {
      if (typeof userId !== 'string' || !userId.trim()) return { ok: false, reason: 'account_required' };
      const packageKey = createOfflinePackageKey({ userId, resourceId, resourceVersion });
      const record = await storage.getPackage(packageKey);
      if (!record || record.userId !== userId) return { ok: false, reason: 'package_not_found' };
      if (Date.parse(record.manifest?.offlineExpiresAt) <= now() ||
          Date.parse(record.entitlementExpiresAt) <= now()) {
        return { ok: false, reason: 'offline_lease_expired' };
      }
      try {
        const keyResult = await existingAccountKey(userId);
        if (!keyResult.ok) return { ok: false, reason: keyResult.reason };
        const key = keyResult.key;
        const encrypted = await storage.getChunks(packageKey);
        const plainChunks = [];
        for (const expected of record.manifest.chunks) {
          const stored = encrypted.find((chunk) => chunk.chunkId === expected.id);
          if (!stored) return { ok: false, reason: 'encrypted_chunk_missing' };
          const aad = chunkAad({
            userId, resourceId, resourceVersion, chunkId: expected.id,
          });
          const bytes = await cryptoProvider.subtle.decrypt(
            { name: 'AES-GCM', iv: stored.nonce, additionalData: aad, tagLength: 128 },
            key,
            stored.ciphertext,
          );
          plainChunks.push({ id: expected.id, bytes: new Uint8Array(bytes) });
        }
        const verified = await verifyOfflinePackage({
          manifest: record.manifest, chunks: plainChunks, cryptoProvider, now: now(),
        });
        if (!verified.ok) return { ok: false, reason: verified.reason };
        const actualSha256 = [...new Uint8Array(await cryptoProvider.subtle.digest('SHA-256', verified.bytes))]
          .map((byte) => byte.toString(16).padStart(2, '0')).join('');
        if (!canOpenOfflinePackage({
          packageRecord: record, currentUserId: userId, actualSha256, now: now(),
        })) return { ok: false, reason: 'offline_access_denied' };
        return { ok: true, bytes: verified.bytes, manifest: record.manifest };
      } catch {
        return { ok: false, reason: 'decryption_failed' };
      }
    },

    async remove({ userId, resourceId, resourceVersion }) {
      const packageKey = createOfflinePackageKey({ userId, resourceId, resourceVersion });
      const record = await storage.getPackage(packageKey);
      if (!record || record.userId !== userId) return false;
      await storage.deletePackage(packageKey);
      return true;
    },

    async clearAccount(userId) {
      if (typeof userId !== 'string' || !userId.trim() || userId.length > 128) {
        throw new TypeError('A valid authenticated account is required');
      }
      await storage.deleteAccount(userId);
    },
  };
}
