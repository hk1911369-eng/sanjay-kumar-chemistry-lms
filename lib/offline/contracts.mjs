/**
 * Pure validation rules for explicitly downloadable learning packages.
 *
 * This module does not fetch, persist, decrypt, or grant access to content.
 * Server authorization remains authoritative; callers must attach the
 * authenticated account scope only after the server has issued a manifest.
 */
export const OFFLINE_MANIFEST_VERSION = 1;
export const OFFLINE_MAX_PACKAGE_BYTES = 100 * 1024 * 1024;
export const OFFLINE_MAX_CHUNKS = 500;

const RESOURCE_TYPES = new Set([
  'lesson',
  'pdf',
  'slide',
  'document',
  'video',
  'audio',
  'image',
]);

const DOWNLOAD_TRANSITIONS = Object.freeze({
  queued: new Set(['downloading', 'cancelled']),
  downloading: new Set(['verifying', 'failed', 'cancelled']),
  verifying: new Set(['complete', 'failed', 'cancelled']),
  failed: new Set(['queued', 'cancelled']),
  complete: new Set(),
  cancelled: new Set(),
});

const isNonEmptyString = (value, max = 200) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

const isSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);

const parseTimestamp = (value) => {
  if (typeof value !== 'string' || !value.trim()) return NaN;
  return Date.parse(value);
};

/**
 * Validate a server-issued manifest before any bytes are stored.
 * Required shape:
 * {
 *   manifestVersion, resourceId, resourceVersion, resourceType,
 *   offlineAllowed, issuedAt, offlineExpiresAt, totalBytes, sha256,
 *   chunks: [{ id, size, sha256 }]
 * }
 */
export function validateOfflineManifest(manifest, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const fail = (reason) => ({ ok: false, reason });

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return fail('invalid_manifest');
  }
  if (manifest.manifestVersion !== OFFLINE_MANIFEST_VERSION) {
    return fail('unsupported_manifest_version');
  }
  if (!isNonEmptyString(manifest.resourceId, 128)) return fail('invalid_resource_id');
  if (!Number.isSafeInteger(manifest.resourceVersion) || manifest.resourceVersion < 1) {
    return fail('invalid_resource_version');
  }
  if (!RESOURCE_TYPES.has(manifest.resourceType)) return fail('unsupported_resource_type');
  if (manifest.offlineAllowed !== true) return fail('offline_not_permitted');

  const issuedAt = parseTimestamp(manifest.issuedAt);
  const expiresAt = parseTimestamp(manifest.offlineExpiresAt);
  if (!Number.isFinite(issuedAt) || issuedAt > now + 5 * 60 * 1000) {
    return fail('invalid_issued_at');
  }
  if (!Number.isFinite(expiresAt) || expiresAt <= now || expiresAt <= issuedAt) {
    return fail('manifest_expired_or_invalid');
  }

  if (!Number.isSafeInteger(manifest.totalBytes) ||
      manifest.totalBytes < 1 ||
      manifest.totalBytes > OFFLINE_MAX_PACKAGE_BYTES) {
    return fail('invalid_package_size');
  }
  if (!isSha256(manifest.sha256)) return fail('invalid_package_checksum');
  if (!Array.isArray(manifest.chunks) ||
      manifest.chunks.length < 1 ||
      manifest.chunks.length > OFFLINE_MAX_CHUNKS) {
    return fail('invalid_chunks');
  }

  const chunkIds = new Set();
  let totalChunkBytes = 0;
  for (const chunk of manifest.chunks) {
    if (!chunk || typeof chunk !== 'object' || Array.isArray(chunk)) {
      return fail('invalid_chunk');
    }
    if (!isNonEmptyString(chunk.id, 128) || chunkIds.has(chunk.id)) {
      return fail('invalid_or_duplicate_chunk_id');
    }
    if (!Number.isSafeInteger(chunk.size) || chunk.size < 1) {
      return fail('invalid_chunk_size');
    }
    if (!isSha256(chunk.sha256)) return fail('invalid_chunk_checksum');
    chunkIds.add(chunk.id);
    totalChunkBytes += chunk.size;
    if (!Number.isSafeInteger(totalChunkBytes) || totalChunkBytes > OFFLINE_MAX_PACKAGE_BYTES) {
      return fail('invalid_package_size');
    }
  }

  if (totalChunkBytes !== manifest.totalBytes) return fail('chunk_size_mismatch');
  return { ok: true, reason: null };
}

/**
 * Build an account-scoped key. This is namespacing, not an authorization check.
 */
export function createOfflinePackageKey({ userId, resourceId, resourceVersion }) {
  if (!isNonEmptyString(userId, 128) ||
      !isNonEmptyString(resourceId, 128) ||
      !Number.isSafeInteger(resourceVersion) ||
      resourceVersion < 1) {
    throw new TypeError('A valid user, resource and positive version are required');
  }
  return [userId, resourceId, String(resourceVersion)].map(encodeURIComponent).join(':');
}

/**
 * Fail closed when opening locally stored content. A local record is usable
 * only for the currently authenticated account and while both server-issued
 * offline and entitlement leases remain valid.
 */
export function canOpenOfflinePackage({ packageRecord, currentUserId, actualSha256, now = Date.now() }) {
  if (!packageRecord || typeof packageRecord !== 'object') return false;
  if (!isNonEmptyString(currentUserId, 128) || packageRecord.userId !== currentUserId) return false;
  if (packageRecord.state !== 'complete') return false;

  const manifest = packageRecord.manifest;
  if (!manifest || manifest.offlineAllowed !== true || !isSha256(manifest.sha256)) return false;
  // The caller must hash the bytes it is about to open; a persisted boolean is not proof.
  if (!isSha256(actualSha256) || actualSha256.toLowerCase() !== manifest.sha256.toLowerCase()) return false;
  if (!isNonEmptyString(manifest.resourceId, 128) ||
      !Number.isSafeInteger(manifest.resourceVersion) ||
      manifest.resourceVersion < 1) return false;

  const offlineExpiry = parseTimestamp(manifest.offlineExpiresAt);
  const entitlementExpiry = parseTimestamp(packageRecord.entitlementExpiresAt);
  if (!Number.isFinite(offlineExpiry) || offlineExpiry <= now) return false;
  if (!Number.isFinite(entitlementExpiry) || entitlementExpiry <= now) return false;
  return true;
}

export function canTransitionDownload(currentState, nextState) {
  return Boolean(DOWNLOAD_TRANSITIONS[currentState]?.has(nextState));
}

export function transitionDownloadState(currentState, nextState) {
  if (!canTransitionDownload(currentState, nextState)) {
    throw new Error(`Invalid offline download transition: ${currentState} -> ${nextState}`);
  }
  return nextState;
}
