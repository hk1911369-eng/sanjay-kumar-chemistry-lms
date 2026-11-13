import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOfflineLessonPackage } from '../lib/offline/server-manifest.mjs';
import { createOfflineDownloadJobs } from '../lib/offline/download-jobs.mjs';
import { downloadOfflineLesson } from '../lib/offline/lesson-download.mjs';

const NOW = Date.parse('2026-11-13T06:00:00.000Z');
const lessonId = '7d8c5c4a-1e2b-4f3a-8a9b-0123456789ab';

function memoryJobStorage() {
  const records = new Map();
  return {
    records,
    async put(job) { records.set(job.id, structuredClone(job)); },
    async get(id) { return structuredClone(records.get(id) ?? null); },
    async listByUser(userId) { return [...records.values()].filter((job) => job.userId === userId); },
    async deleteByUser(userId) {
      for (const [id, job] of records) if (job.userId === userId) records.delete(id);
    },
  };
}

function serverPayload(overrides = {}) {
  const result = buildOfflineLessonPackage({
    lesson: {
      id: lessonId, course_id: '8d8c5c4a-1e2b-4f3a-8a9b-0123456789ab',
      is_published: true, offline_allowed: true, updated_at: '2026-11-12T10:00:00.000Z',
      content: 'JMT offline lesson content',
    },
    entitlementExpiresAt: '2026-11-30T17:59:59.999Z',
    now: NOW,
  });
  return { ...result, lessonTitle: 'Atomic Structure', ...overrides };
}

function setup({ payload = serverPayload(), status = 200, vault = null } = {}) {
  const storage = memoryJobStorage();
  const jobs = createOfflineDownloadJobs({ storage, now: () => NOW });
  const saved = [];
  const vaultAdapter = vault ?? {
    async savePackage(input) {
      saved.push(input);
      return { key: 'student-a:lesson:1', resourceId: input.manifest.resourceId };
    },
    async remove() {},
  };
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: status >= 200 && status < 300,
      status,
      async json() { return payload; },
    };
  };
  return { storage, jobs, vault: vaultAdapter, saved, requests, fetcher };
}

test('downloads server-authorized lesson content into the encrypted vault and completes its job', async () => {
  const f = setup();
  const result = await downloadOfflineLesson({
    userId: 'student-a', lessonId, fetcher: f.fetcher, vault: f.vault,
    jobs: f.jobs, createId: () => 'job-1', now: () => NOW,
  });
  assert.equal(result.jobId, 'job-1');
  assert.equal(f.saved.length, 1);
  assert.equal(f.saved[0].userId, 'student-a');\n  assert.equal(f.saved[0].title, 'Atomic Structure');
  assert.equal(f.saved[0].chunks[0].bytes instanceof Uint8Array, true);
  assert.match(f.requests[0].url, /lessonId=/);
  assert.equal(f.requests[0].options.credentials, 'same-origin');
  assert.equal(f.requests[0].options.cache, 'no-store');
  const job = await f.jobs.listForAccount('student-a');
  assert.equal(job.length, 1);
  assert.equal(job[0].state, 'complete');
  assert.equal(job[0].bytesReceived, job[0].totalBytes);
  assert.equal(job[0].verifiedSha256, job[0].manifestSha256);
});

test('does not create a local job when server authorization is denied', async () => {
  const f = setup({ status: 404 });
  await assert.rejects(downloadOfflineLesson({
    userId: 'student-a', lessonId, fetcher: f.fetcher, vault: f.vault, jobs: f.jobs,
    createId: () => 'job-1', now: () => NOW,
  }), /did not authorize/);
  assert.equal(f.storage.records.size, 0);
  assert.equal(f.saved.length, 0);
});

test('rejects mismatched resource identity and malformed server chunk data', async () => {
  const mismatch = setup({ payload: serverPayload({
    manifest: { ...serverPayload().manifest, resourceId: 'another-lesson' },
  }) });
  await assert.rejects(downloadOfflineLesson({
    userId: 'student-a', lessonId, fetcher: mismatch.fetcher, vault: mismatch.vault,
    jobs: mismatch.jobs, createId: () => 'job-1', now: () => NOW,
  }), /manifest rejected|response is incomplete/i);

  const malformed = setup({ payload: serverPayload({ chunks: [{ id: 'chunk-0001', bytesBase64: '!' }] }) });
  await assert.rejects(downloadOfflineLesson({
    userId: 'student-a', lessonId, fetcher: malformed.fetcher, vault: malformed.vault,
    jobs: malformed.jobs, createId: () => 'job-1', now: () => NOW,
  }));
  assert.equal(malformed.storage.records.size, 0);
});

test('marks the job failed and removes partially committed content if final job commit fails', async () => {
  const f = setup();
  let removed = false;
  const vault = {
    async savePackage() { return { key: 'stored-package' }; },
    async remove() { removed = true; },
  };
  const jobs = {
    async enqueue(input) { return { ...input, id: 'job-1' }; },
    async transition(input) {
      if (input.nextState === 'complete') throw new Error('job store unavailable');
      return input;
    },
  };
  await assert.rejects(downloadOfflineLesson({
    userId: 'student-a', lessonId, fetcher: f.fetcher, vault, jobs,
    createId: () => 'job-1', now: () => NOW,
  }), /job store unavailable/);
  assert.equal(removed, true);
});
