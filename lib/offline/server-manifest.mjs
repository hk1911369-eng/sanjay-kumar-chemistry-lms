import { createHash } from 'node:crypto';

const CHUNK_BYTES = 256 * 1024;
const MAX_LESSON_BYTES = 1024 * 1024;
const MAX_OFFLINE_LEASE_MS = 7 * 24 * 60 * 60 * 1000;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/**
 * Build a bounded, integrity-checkable lesson package after the caller has
 * authorized the current account against the live course and billing records.
 * This helper does not perform authorization and must only run server-side.
 */
export function buildOfflineLessonPackage({
  lesson,
  entitlementExpiresAt,
  now = Date.now(),
} = {}) {
  if (!lesson || typeof lesson !== 'object') throw new TypeError('Lesson record is required');
  if (lesson.is_published !== true) throw new TypeError('Lesson is not published');
  if (typeof lesson.id !== 'string' || !lesson.id.trim() ||
      typeof lesson.course_id !== 'string' || !lesson.course_id.trim()) {
    throw new TypeError('Lesson identity is invalid');
  }
  const updatedAt = Date.parse(lesson.updated_at);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) throw new TypeError('Lesson version is invalid');

  const entitlementExpiry = Date.parse(entitlementExpiresAt);
  if (!Number.isFinite(entitlementExpiry) || entitlementExpiry <= now) {
    throw new TypeError('Active paid entitlement is required');
  }

  const bytes = new TextEncoder().encode(typeof lesson.content === 'string' ? lesson.content : '');
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_LESSON_BYTES) {
    throw new TypeError('Lesson content is empty or exceeds the offline package limit');
  }

  const offlineExpiry = Math.min(entitlementExpiry, now + MAX_OFFLINE_LEASE_MS);
  const chunks = [];
  for (let offset = 0, index = 0; offset < bytes.byteLength; offset += CHUNK_BYTES, index += 1) {
    const part = bytes.slice(offset, Math.min(offset + CHUNK_BYTES, bytes.byteLength));
    chunks.push({
      id: `chunk-${String(index + 1).padStart(4, '0')}`,
      bytes: part,
    });
  }

  const manifest = {
    manifestVersion: 1,
    resourceId: lesson.id,
    resourceVersion: updatedAt,
    resourceType: 'lesson',
    offlineAllowed: true,
    issuedAt: new Date(now).toISOString(),
    offlineExpiresAt: new Date(offlineExpiry).toISOString(),
    totalBytes: bytes.byteLength,
    sha256: sha256(bytes),
    chunks: chunks.map(({ id, bytes: part }) => ({
      id,
      size: part.byteLength,
      sha256: sha256(part),
    })),
  };

  return {
    manifest,
    entitlementExpiresAt: new Date(entitlementExpiry).toISOString(),
    chunks: chunks.map(({ id, bytes: part }) => ({
      id,
      bytesBase64: Buffer.from(part).toString('base64'),
    })),
  };
}
