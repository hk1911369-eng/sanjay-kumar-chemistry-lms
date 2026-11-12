import { canTransitionDownload } from './contracts.mjs';

export const OFFLINE_JOBS_DB = 'jmt-offline-download-jobs';
export const OFFLINE_JOBS_DB_VERSION = 1;
export const OFFLINE_JOBS_STORE = 'jobs';

const JOB_STATES = new Set(['queued', 'downloading', 'verifying', 'complete', 'failed', 'cancelled']);
const ERROR_CODES = new Set([
  'network_error', 'quota_exceeded', 'integrity_failed',
  'manifest_expired', 'permission_revoked', 'storage_unavailable',
]);

function validId(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 128;
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
  });
}

/**
 * Download-job persistence is deliberately separate from content bytes.
 * It stores no signed URLs, tokens, answers, grades or learner submissions.
 */
export function createIndexedDbDownloadJobStorage({
  indexedDB = globalThis.indexedDB,
  databaseName = OFFLINE_JOBS_DB,
} = {}) {
  if (!indexedDB || typeof indexedDB.open !== 'function') {
    throw new Error('IndexedDB is unavailable in this browser');
  }

  let dbPromise;
  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, OFFLINE_JOBS_DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(OFFLINE_JOBS_STORE)) {
            const store = db.createObjectStore(OFFLINE_JOBS_STORE, { keyPath: 'id' });
            store.createIndex('by_user', 'userId', { unique: false });
            store.createIndex('by_user_state', ['userId', 'state'], { unique: false });
          }
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => request.result.close();
          resolve(request.result);
        };
        request.onerror = () => reject(request.error || new Error('Unable to open download jobs'));
        request.onblocked = () => reject(new Error('Download job database upgrade is blocked'));
      }).catch((error) => {
        dbPromise = undefined;
        throw error;
      });
    }
    return dbPromise;
  }

  return {
    async put(job) {
      const db = await openDb();
      const tx = db.transaction(OFFLINE_JOBS_STORE, 'readwrite');
      const done = transactionComplete(tx);
      tx.objectStore(OFFLINE_JOBS_STORE).put(job);
      await done;
    },
    async get(id) {
      const db = await openDb();
      const tx = db.transaction(OFFLINE_JOBS_STORE, 'readonly');
      const done = transactionComplete(tx);
      const result = await requestValue(tx.objectStore(OFFLINE_JOBS_STORE).get(id));
      await done;
      return result ?? null;
    },
    async listByUser(userId) {
      const db = await openDb();
      const tx = db.transaction(OFFLINE_JOBS_STORE, 'readonly');
      const done = transactionComplete(tx);
      const result = await requestValue(tx.objectStore(OFFLINE_JOBS_STORE).index('by_user').getAll(userId));
      await done;
      return result;
    },
    async deleteByUser(userId) {
      const db = await openDb();
      const tx = db.transaction(OFFLINE_JOBS_STORE, 'readwrite');
      const done = transactionComplete(tx);
      const request = tx.objectStore(OFFLINE_JOBS_STORE).index('by_user').openCursor(userId);
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
 * Policy layer for durable download jobs. An injected storage adapter makes
 * the lifecycle deterministic in tests and keeps browser persistence swappable.
 */
export function createOfflineDownloadJobs({ storage, now = () => Date.now() } = {}) {
  if (!storage || !['put', 'get', 'listByUser', 'deleteByUser'].every(
    (name) => typeof storage[name] === 'function',
  )) {
    throw new TypeError('A complete download-job storage adapter is required');
  }

  return {
    async enqueue({ id, userId, resourceId, resourceVersion, totalBytes, manifestSha256 }) {
      if (![id, userId, resourceId].every(validId) ||
          !Number.isSafeInteger(resourceVersion) || resourceVersion < 1 ||
          !Number.isSafeInteger(totalBytes) || totalBytes < 1 ||
          typeof manifestSha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(manifestSha256)) {
        throw new TypeError('Invalid offline download job');
      }
      const existing = await storage.get(id);
      if (existing) throw new TypeError('Download job ID already exists');
      const timestamp = new Date(now()).toISOString();
      const job = {
        id, userId, resourceId, resourceVersion, totalBytes,
        manifestSha256: manifestSha256.toLowerCase(),
        state: 'queued', bytesReceived: 0, retryCount: 0,
        createdAt: timestamp, updatedAt: timestamp, lastErrorCode: null,
      };
      await storage.put(job);
      return job;
    },

    async transition({ id, userId, nextState, bytesReceived, errorCode, verifiedSha256 }) {
      if (!validId(id) || !validId(userId) || !JOB_STATES.has(nextState)) {
        throw new TypeError('Invalid download job transition request');
      }
      const job = await storage.get(id);
      if (!job || job.userId !== userId) return null;
      if (!canTransitionDownload(job.state, nextState)) {
        throw new TypeError(`Invalid offline download transition: ${job.state} -> ${nextState}`);
      }
      if (bytesReceived !== undefined &&
          (!Number.isSafeInteger(bytesReceived) || bytesReceived < 0 || bytesReceived > job.totalBytes)) {
        throw new TypeError('Invalid downloaded byte count');
      }
      if ((nextState === 'verifying' || nextState === 'complete') &&
          (bytesReceived ?? job.bytesReceived) !== job.totalBytes) {
        throw new TypeError('A complete byte count is required before verification or completion');
      }
      if (nextState === 'complete' &&
          (typeof verifiedSha256 !== 'string' ||
           !/^[a-f0-9]{64}$/i.test(verifiedSha256) ||
           verifiedSha256.toLowerCase() !== job.manifestSha256)) {
        throw new TypeError('A matching verified package checksum is required for completion');
      }
      if (nextState !== 'complete' && verifiedSha256 !== undefined) {
        throw new TypeError('Verified checksum is only accepted when completing a job');
      }
      if (nextState === 'failed' && !ERROR_CODES.has(errorCode)) {
        throw new TypeError('A recognized download error code is required');
      }
      if (nextState !== 'failed' && errorCode !== undefined) {
        throw new TypeError('Error codes are only accepted for failed jobs');
      }
      const updated = {
        ...job,
        state: nextState,
        bytesReceived: bytesReceived ?? job.bytesReceived,
        retryCount: nextState === 'queued' && job.state === 'failed' ? job.retryCount + 1 : job.retryCount,
        lastErrorCode: nextState === 'failed' ? errorCode : null,
        verifiedSha256: nextState === 'complete' ? verifiedSha256.toLowerCase() : null,
        updatedAt: new Date(now()).toISOString(),
      };
      await storage.put(updated);
      return updated;
    },

    async listForAccount(userId) {
      if (!validId(userId)) return [];
      return storage.listByUser(userId);
    },

    async clearAccount(userId) {
      if (!validId(userId)) throw new TypeError('A valid authenticated user ID is required');
      await storage.deleteByUser(userId);
    },
  };
}
