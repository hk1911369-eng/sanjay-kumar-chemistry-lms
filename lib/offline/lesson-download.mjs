import { validateOfflineManifest } from './contracts.mjs';

function decodeBase64(value) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError('Invalid offline chunk encoding');
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/**
 * Download the small, server-authorized lesson package and commit it to the
 * encrypted vault. The caller supplies the authenticated user ID obtained
 * from its current Supabase session; the API independently verifies cookies.
 */
export async function downloadOfflineLesson({
  userId,
  lessonId,
  fetcher = globalThis.fetch,
  vault,
  jobs,
  createId = () => globalThis.crypto.randomUUID(),
  now = () => Date.now(),
} = {}) {
  if (typeof userId !== 'string' || !userId.trim() ||
      typeof lessonId !== 'string' || !lessonId.trim()) {
    throw new TypeError('Authenticated account and lesson ID are required');
  }
  if (typeof fetcher !== 'function' || !vault || typeof vault.savePackage !== 'function' ||
      !jobs || !['enqueue', 'transition'].every((method) => typeof jobs[method] === 'function')) {
    throw new TypeError('Offline download dependencies are incomplete');
  }

  const response = await fetcher(`/api/offline/lesson-package?lessonId=${encodeURIComponent(lessonId)}`, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response?.ok) {
    const error = new Error('The server did not authorize this offline lesson package');
    error.code = response?.status === 401 || response?.status === 403 ? 'permission_revoked' : 'network_error';
    throw error;
  }

  const payload = await response.json();
  const manifest = payload?.manifest;
  const validation = validateOfflineManifest(manifest, { now: now() });
  if (!validation.ok) throw new TypeError(`Offline manifest rejected: ${validation.reason}`);
  if (manifest.resourceId !== lessonId || !Array.isArray(payload.chunks) ||
      payload.chunks.length !== manifest.chunks.length ||
      typeof payload.entitlementExpiresAt !== 'string') {
    throw new TypeError('Server offline package response is incomplete');
  }

  const chunks = payload.chunks.map((chunk) => ({
    id: chunk.id,
    bytes: decodeBase64(chunk.bytesBase64),
  }));
  const job = await jobs.enqueue({
    id: createId(),
    userId,
    resourceId: manifest.resourceId,
    resourceVersion: manifest.resourceVersion,
    totalBytes: manifest.totalBytes,
    manifestSha256: manifest.sha256,
  });

  try {
    await jobs.transition({
      id: job.id, userId, nextState: 'downloading',
      bytesReceived: manifest.totalBytes,
    });
    await jobs.transition({
      id: job.id, userId, nextState: 'verifying',
      bytesReceived: manifest.totalBytes,
    });
    const saved = await vault.savePackage({
      userId, manifest, chunks,
      entitlementExpiresAt: payload.entitlementExpiresAt,
    });
    await jobs.transition({
      id: job.id, userId, nextState: 'complete',
      bytesReceived: manifest.totalBytes,
      verifiedSha256: manifest.sha256,
    });
    return { ...saved, jobId: job.id };
  } catch (error) {
    try {
      await jobs.transition({
        id: job.id,
        userId,
        nextState: 'failed',
        errorCode: error?.code === 'permission_revoked' ? 'permission_revoked' :
          /quota/i.test(String(error?.message)) ? 'quota_exceeded' :
            /integrity|checksum|digest/i.test(String(error?.message)) ? 'integrity_failed' :
              'storage_unavailable',
      });
    } catch {
      // Preserve the original failure; a failed metadata write must not mask it.
    }
    throw error;
  }
}
