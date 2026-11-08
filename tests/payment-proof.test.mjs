import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isAllowedImageSignature } from '../lib/image-signature.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('payment proof image signatures are checked, not just file extensions', () => {
  assert.equal(isAllowedImageSignature('image/jpeg', Uint8Array.from([0xff,0xd8,0xff,0x00])), true);
  assert.equal(isAllowedImageSignature('image/png', Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), true);
  assert.equal(isAllowedImageSignature('image/webp', Uint8Array.from([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50])), true);
  assert.equal(isAllowedImageSignature('image/png', Uint8Array.from([0xff,0xd8,0xff])), false);
  assert.equal(isAllowedImageSignature('image/svg+xml', Uint8Array.from([0x3c,0x73,0x76,0x67])), false);
  assert.equal(isAllowedImageSignature('image/jpeg', new Uint8Array()), false);
  assert.equal(isAllowedImageSignature('application/octet-stream', Uint8Array.from([0xff,0xd8,0xff])), false);
  assert.equal(isAllowedImageSignature('image/jpeg', 'not bytes'), false);
});

test('payment proof storage is private, bounded and role-scoped', async () => {
  const migration = await read('supabase/migrations/0040_private_manual_payment_proofs.sql');
  assert.match(migration, /public = false/);
  assert.match(migration, /file_size_limit\s*=\s*3145728/);
  assert.match(migration, /allowed_mime_types\s*=\s*array\['image\/jpeg','image\/png','image\/webp'\]/);
  assert.match(migration, /students upload own unsubmitted payment proofs/);
  assert.match(migration, /admins read payment proofs/);
  assert.match(migration, /current_role\(\).*admin/);
  assert.match(migration, /validate_manual_payment_proof_path/);
  assert.match(migration, /revoke all on function/);
});

test('payment form requires a proof and action validates, uploads and cleans up failed submissions', async () => {
  const student = await read('app/student/page.tsx');
  const action = await read('app/actions/payments.ts');
  const admin = await read('app/admin/page.tsx');
  assert.match(student, /name="payment_proof" type="file"/);
  assert.match(student, /required/);
  assert.match(action, /proof\.size > 3 \* 1024 \* 1024/);
  assert.match(action, /isAllowedImageSignature/);
  assert.match(action, /proof_storage_path/);
  assert.match(action, /payment-proofs/);
  assert.match(action, /remove\(\[proofPath\]\)/);
  assert.match(admin, /createSignedUrls/);
  assert.match(admin, /proofLinks\.get/);
  assert.doesNotMatch(admin, /getPublicUrl\(/);
});
