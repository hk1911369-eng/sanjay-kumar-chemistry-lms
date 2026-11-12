import {
  createOfflinePackageKey,
  validateOfflineManifest,
} from './contracts.mjs';

export const OFFLINE_REGISTRY_DB = 'jmt-offline-registry';
export const OFFLINE_REGISTRY_VERSION = 1;
export const OFFLINE_PACKAGE_STORE = 'packages';

const SAFE_STATES = new Set(['queued', 'downloading', 'failed', 'cancelled']);

function cleanManifest(manifest) {
  return {
    manifestVersion: manifest.manifestVersion,
    resourceId: manifest.resourceId,
    resourceVersion: manifest.resourceVersion,
    resourceType: manifest.resourceType,
    offlineAllowed: manifest.offlineAllowed,
    issuedAt: manifest.issuedAt,
    offlineExpiresAt: manifest.offlineExpiresAt,
    totalBytes: manifest.totalBytes,
    sha256: manifest.sha256.toLowerCase(),
    chunks: manifest.chunks.map((chunk) => ({
      id: chunk.id,
      size: chunk.size,
      sha256: chunk.sha256.toLowerCase(),
    })),
  };
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
  });
}

/**
 * IndexedDB adapter for non-sensitive package metadata only.
 * It intentionally does not persist lesson bytes, signed URLs, auth tokens,
 * student answers, assessment attempts or progress events.
 */
export function createIndexedDbOfflineStorage({
  indexedDB = globalThis.indexedDB,
  databaseName = OFFLINE_REGISTRY_DB,
} = {}) {
  if (!indexedDB || typeof indexedDB.open !== 'function') {
    throw new Error('IndexedDB is unavailable in this browser');
  }

  let databasePromise;
  function database() {
    if (!databasePromise) {
      databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, OFFLINE_REGISTRY_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(OFFLINE_PACKAGE_STORE)) {
            const store = db.createObjectStore(OFFLINE_PACKAGE_STORE, { keyPath: 'key' });
            store.createIndex('by_user', 'userId', { unique: false });
            store.createIndex('by_user_state', ['userId', 'state'], { unique: false });
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => db.close();
          resolve(db);
        };
        request.onerror = () => reject(request.error || new Error('Unable to open offline registry'));
        request.onblocked = () => reject(new Error('Offline registry upgrade is blocked by another tab'));
      }).catch((error) => {
        databasePromise = undefined;
        throw error;
      });
    }
    return databasePromise;
  }

  return {
    async put(record) {
      const db = await database();
      const tx = db.transaction(OFFLINE_PACKAGE_STORE, 'readwrite');
      const done = transactionDone(tx);
      tx.objectStore(OFFLINE_PACKAGE_STORE).put(record);
      await done;
    },

    async listByUser(userId) {
      const db = await database();
      const tx = db.transaction(OFFLINE_PACKAGE_STORE, 'readonly');
      const done = transactionDone(tx);
      const records = await requestResult(tx.objectStore(OFFLINE_PACKAGE_STORE).index('by_user').getAll(userId));
      await done;
      return records;
    },

    async get(key) {
      const db = await database();
      const tx = db.transaction(OFFLINE_PACKAGE_STORE, 'readonly');
      const done = transactionDone(tx);
      const record = await requestResult(tx.objectStore(OFFLINE_PACKAGE_STORE).get(key));
      await done;
      return record ?? null;
    },

    async delete(key) {
      const db = await database();
      const tx = db.transaction(OFFLINE_PACKAGE_STORE, 'readwrite');
      const done = transactionDone(tx);
      tx.objectStore(OFFLINE_PACKAGE_STORE).delete(key);
      await done;
    },

    async deleteByUser(userId) {
      const db = await database();
      const tx = db.transaction(OFFLINE_PACKAGE_STORE, 'readwrite');
      const done = transactionDone(tx);
      const store = tx.objectStore(OFFLINE_PACKAGE_STORE);
      const request = store.index('by_user').openCursor(userId);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      request.onerror = () => tx.abort();
      await done;
    },
  };
}

/**
 * Account-scoped metadata registry. Storage is injected so policy can be
 * tested without a browser and IndexedDB implementation can be replaced.
 */
export function createOfflineRegistry({ storage, now = () => Date.now() } = {}) {
  if (!storage || !['put', 'listByUser', 'get', 'delete', 'deleteByUser'].every(
    (method) => typeof storage[method] === 'function',
  )) {
    throw new TypeError('A complete offline metadata storage adapter is required');
  }

  return {
    async save({ userId, manifest, entitlementExpiresAt, state = 'queued' }) {
      const timestamp = now();
      if (typeof userId !== 'string' || !userId.trim() || userId.length > 128) {
        throw new TypeError('A valid authenticated user ID is required');
      }
      if (!SAFE_STATES.has(state)) {
        throw new TypeError('Only non-complete download metadata states can be saved');
      }
      const validation = validateOfflineManifest(manifest, { now: timestamp });
      if (!validation.ok) {
        throw new TypeError(`Offline manifest rejected: ${validation.reason}`);
      }
      const entitlementExpiry = Date.parse(entitlementExpiresAt);
      if (!Number.isFinite(entitlementExpiry) || entitlementExpiry <= timestamp) {
        throw new TypeError('A valid, unexpired entitlement lease is required');
      }

      const safeManifest = cleanManifest(manifest);
      const key = createOfflinePackageKey({
        userId,
        resourceId: safeManifest.resourceId,
        resourceVersion: safeManifest.resourceVersion,
      });
      const record = {
        key,
        userId,
        resourceId: safeManifest.resourceId,
        resourceVersion: safeManifest.resourceVersion,
        state,
        manifest: safeManifest,
        entitlementExpiresAt,
        updatedAt: new Date(timestamp).toISOString(),
      };
      await storage.put(record);
      return record;
    },

    async listForUser(userId) {
      if (typeof userId !== 'string' || !userId.trim() || userId.length > 128) return [];
      return storage.listByUser(userId);
    },

    async remove({ userId, resourceId, resourceVersion }) {
      const key = createOfflinePackageKey({ userId, resourceId, resourceVersion });
      const existing = await storage.get(key);
      if (!existing || existing.userId !== userId) return false;
      await storage.delete(key);
      return true;
    },

    async clearAccount(userId) {
      if (typeof userId !== 'string' || !userId.trim() || userId.length > 128) {
        throw new TypeError('A valid authenticated user ID is required');
      }
      await storage.deleteByUser(userId);
    },
  };
}
