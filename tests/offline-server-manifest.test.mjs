import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildOfflineLessonPackage, resolveOfflineEntitlement } from '../lib/offline/server-manifest.mjs';
import { validateOfflineManifest } from '../lib/offline/contracts.mjs';

const NOW = Date.parse('2026-11-13T06:00:00.000Z');
const hash = (value) => createHash('sha256').update(value).digest('hex');

function lesson(overrides = {}) {
  return {
    id: '7d8c5c4a-1e2b-4f3a-8a9b-0123456789ab',
    course_id: '8d8c5c4a-1e2b-4f3a-8a9b-0123456789ab',
    is_published: true,
    offline_allowed: true,
    updated_at: '2026-11-12T10:00:00.000Z',
    content: 'JMT Chemistry lesson: atomic structure.',
    ...overrides,
  };
}

test('builds a versioned, chunked manifest with package and per-chunk hashes', () => {
  const result = buildOfflineLessonPackage({
    lesson: lesson(),
    entitlementExpiresAt: '2026-11-30T17:59:59.999Z',
    now: NOW,
  });
  const bytes = Buffer.from(result.chunks[0].bytesBase64, 'base64');
  assert.equal(result.manifest.resourceId, lesson().id);
  assert.equal(result.manifest.resourceVersion, Date.parse(lesson().updated_at));
  assert.equal(result.manifest.totalBytes, bytes.length);
  assert.equal(result.manifest.sha256, hash(bytes));
  assert.equal(result.manifest.chunks[0].sha256, hash(bytes));
  assert.equal(validateOfflineManifest(result.manifest, { now: NOW }).ok, true);
});

test('caps offline lease at seven days and never beyond paid entitlement', () => {
  const longEntitlement = buildOfflineLessonPackage({
    lesson: lesson(),
    entitlementExpiresAt: '2026-12-31T17:59:59.999Z',
    now: NOW,
  });
  assert.equal(Date.parse(longEntitlement.manifest.offlineExpiresAt), NOW + 7 * 24 * 60 * 60 * 1000);

  const shortEntitlement = buildOfflineLessonPackage({
    lesson: lesson(),
    entitlementExpiresAt: '2026-11-14T17:59:59.999Z',
    now: NOW,
  });
  assert.equal(Date.parse(shortEntitlement.manifest.offlineExpiresAt), Date.parse('2026-11-14T17:59:59.999Z'));
});

test('splits larger lesson content into bounded chunks in manifest order', () => {
  const content = 'x'.repeat(600 * 1024);
  const result = buildOfflineLessonPackage({
    lesson: lesson({ content }),
    entitlementExpiresAt: '2026-11-30T17:59:59.999Z',
    now: NOW,
  });
  assert.equal(result.chunks.length, 3);
  assert.deepEqual(result.manifest.chunks.map((chunk) => chunk.size), [256 * 1024, 256 * 1024, 88 * 1024]);
  assert.equal(result.manifest.totalBytes, 600 * 1024);
  assert.equal(validateOfflineManifest(result.manifest, { now: NOW }).ok, true);
});

test('rejects unpublished, empty, oversized and unentitled lesson packages', () => {
  assert.throws(() => buildOfflineLessonPackage({
    lesson: lesson({ offline_allowed: false }),
    entitlementExpiresAt: '2026-11-30T17:59:59.999Z', now: NOW,
  }), /not approved for offline use/);
  assert.throws(() => buildOfflineLessonPackage({
    lesson: lesson({ is_published: false }),
    entitlementExpiresAt: '2026-11-30T17:59:59.999Z', now: NOW,
  }), /not published/);
  assert.throws(() => buildOfflineLessonPackage({
    lesson: lesson({ content: '' }),
    entitlementExpiresAt: '2026-11-30T17:59:59.999Z', now: NOW,
  }), /empty/);
  assert.throws(() => buildOfflineLessonPackage({
    lesson: lesson({ content: 'x'.repeat(1024 * 1024 + 1) }),
    entitlementExpiresAt: '2026-11-30T17:59:59.999Z', now: NOW,
  }), /exceeds/);
  assert.throws(() => buildOfflineLessonPackage({
    lesson: lesson(),
    entitlementExpiresAt: '2026-11-12T00:00:00.000Z', now: NOW,
  }), /Active paid entitlement/);
});

test('server entitlement requires active student, published course and paid current month', () => {
  const profile = { role: 'student', is_active: true };
  const course = { is_published: true, archived_at: null };
  const enrollment = { status: 'active', admission_fee_paid: true, paid_through: '2026-11-30' };
  assert.equal(
    resolveOfflineEntitlement({ profile, course, enrollment, now: NOW }),
    '2026-11-30T17:59:59.999Z',
  );
  assert.equal(resolveOfflineEntitlement({
    profile: { ...profile, is_active: false }, course, enrollment, now: NOW,
  }), null);
  assert.equal(resolveOfflineEntitlement({
    profile: { ...profile, role: 'teacher' }, course, enrollment, now: NOW,
  }), null);
  assert.equal(resolveOfflineEntitlement({
    profile, course: { ...course, is_published: false }, enrollment, now: NOW,
  }), null);
  assert.equal(resolveOfflineEntitlement({
    profile, course: { ...course, archived_at: '2026-11-01T00:00:00.000Z' }, enrollment, now: NOW,
  }), null);
  assert.equal(resolveOfflineEntitlement({
    profile, course, enrollment: { ...enrollment, status: 'inactive' }, now: NOW,
  }), null);
  assert.equal(resolveOfflineEntitlement({
    profile, course, enrollment: { ...enrollment, admission_fee_paid: false }, now: NOW,
  }), null);
  assert.equal(resolveOfflineEntitlement({
    profile, course, enrollment: { ...enrollment, paid_through: '2026-10-31' }, now: NOW,
  }), null);
});

test('rejects invalid or malformed paid-through dates', () => {
  const profile = { role: 'student', is_active: true };
  const course = { is_published: true, archived_at: null };
  for (const paidThrough of ['2026-02-30', '2026/11/30', '', null]) {
    assert.equal(resolveOfflineEntitlement({
      profile, course,
      enrollment: { status: 'active', admission_fee_paid: true, paid_through: paidThrough },
      now: NOW,
    }), null);
  }
});
