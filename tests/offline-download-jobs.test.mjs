import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createIndexedDbDownloadJobStorage,
  createOfflineDownloadJobs,
  OFFLINE_JOBS_DB,
  OFFLINE_JOBS_DB_VERSION,
} from '../lib/offline/download-jobs.mjs';

const NOW = Date.parse('2026-11-13T00:00:00.000Z');
const HASH = 'a'.repeat(64);

function memoryStorage() {
  const records = new Map();
  return {
    records,
    async put(job) { records.set(job.id, structuredClone(job)); },
    async get(id) { return records.has(id) ? structuredClone(records.get(id)) : null; },
    async listByUser(userId) {
      return [...records.values()].filter((job) => job.userId === userId).map((job) => structuredClone(job));
    },
    async deleteByUser(userId) {
      for (const [id, job] of records) if (job.userId === userId) records.delete(id);
    },
  };
}

function fixture() {
  const storage = memoryStorage();
  const jobs = createOfflineDownloadJobs({ storage, now: () => NOW });
  return { storage, jobs };
}

const input = (overrides = {}) => ({
  id: 'job-1',
  userId: 'student-a',
  resourceId: 'lesson-1',
  resourceVersion: 2,
  totalBytes: 1024,
  manifestSha256: HASH,
  ...overrides,
});

test('defines a separate versioned IndexedDB database for download jobs', () => {
  assert.equal(OFFLINE_JOBS_DB, 'jmt-offline-download-jobs');
  assert.equal(OFFLINE_JOBS_DB_VERSION, 1);
});

test('fails closed when IndexedDB is unavailable', () => {
  assert.throws(() => createIndexedDbDownloadJobStorage({ indexedDB: undefined }), /IndexedDB is unavailable/);
});

test('enqueues a minimal account-scoped job without credentials or signed URLs', async () => {
  const { storage, jobs } = fixture();
  const job = await jobs.enqueue(input({
    signedUrl: 'https://private.example/file?token=secret',
    accessToken: 'never-store',
  }));
  assert.equal(job.state, 'queued');
  assert.equal(job.bytesReceived, 0);
  assert.equal(job.retryCount, 0);
  assert.equal(job.manifestSha256, HASH);
  assert.equal('signedUrl' in job, false);
  assert.equal('accessToken' in job, false);
  assert.equal(JSON.stringify([...storage.records.values()]).includes('secret'), false);
});

test('rejects malformed job metadata and duplicate job IDs', async () => {
  const { jobs } = fixture();
  await assert.rejects(jobs.enqueue(input({ totalBytes: -1 })), /Invalid offline download job/);
  await assert.rejects(jobs.enqueue(input({ manifestSha256: 'bad' })), /Invalid offline download job/);
  await jobs.enqueue(input());
  await assert.rejects(jobs.enqueue(input()), /already exists/);
});

test('enforces the download lifecycle and records bounded byte progress', async () => {
  const { jobs } = fixture();
  await jobs.enqueue(input());
  await assert.rejects(
    jobs.transition({ id: 'job-1', userId: 'student-a', nextState: 'verifying', bytesReceived: 256 }),
    /complete byte count/
  );
  let job = await jobs.transition({ id: 'job-1', userId: 'student-a', nextState: 'downloading', bytesReceived: 256 });
  assert.equal(job.bytesReceived, 256);
  job = await jobs.transition({ id: 'job-1', userId: 'student-a', nextState: 'verifying', bytesReceived: 1024 });
  assert.equal(job.bytesReceived, 1024);
  await assert.rejects(
    jobs.transition({ id: 'job-1', userId: 'student-a', nextState: 'complete' }),
    /matching verified package checksum/
  );
  job = await jobs.transition({ id: 'job-1', userId: 'student-a', nextState: 'complete', verifiedSha256: HASH });
  assert.equal(job.state, 'complete');
  assert.equal(job.verifiedSha256, HASH);
  await assert.rejects(
    jobs.transition({ id: 'job-1', userId: 'student-a', nextState: 'downloading' }),
    /Invalid offline download transition/,
  );
  await assert.rejects(
    jobs.transition({ id: 'job-1', userId: 'student-a', nextState: 'downloading', bytesReceived: 1025 }),
    /Invalid offline download transition/,
  );
});

test('requires recognized error codes and increments retry count after explicit retry', async () => {
  const { jobs } = fixture();
  await jobs.enqueue(input());
  await jobs.transition({ id: 'job-1', userId: 'student-a', nextState: 'downloading' });
  await assert.rejects(
    jobs.transition({ id: 'job-1', userId: 'student-a', nextState: 'failed', errorCode: 'raw-server-message' }),
    /recognized download error code/,
  );
  await jobs.transition({ id: 'job-1', userId: 'student-a', nextState: 'failed', errorCode: 'network_error' });
  const retry = await jobs.transition({ id: 'job-1', userId: 'student-a', nextState: 'queued' });
  assert.equal(retry.retryCount, 1);
  assert.equal(retry.lastErrorCode, null);
});

test('prevents another account from transitioning or listing a job', async () => {
  const { jobs } = fixture();
  await jobs.enqueue(input());
  assert.equal(await jobs.transition({ id: 'job-1', userId: 'student-b', nextState: 'downloading' }), null);
  assert.deepEqual(await jobs.listForAccount('student-b'), []);
  assert.equal((await jobs.listForAccount('student-a')).length, 1);
});

test('clears only the signed-out account job records', async () => {
  const { jobs } = fixture();
  await jobs.enqueue(input());
  await jobs.enqueue(input({ id: 'job-2', userId: 'student-b' }));
  await jobs.clearAccount('student-a');
  assert.deepEqual(await jobs.listForAccount('student-a'), []);
  assert.equal((await jobs.listForAccount('student-b')).length, 1);
  await assert.rejects(jobs.clearAccount(''), /valid authenticated user ID/);
});
