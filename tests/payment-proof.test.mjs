import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isAllowedImageSignature } from '../lib/image-signature.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('image proof validation checks actual JPEG, PNG and WebP signatures', () => {
  assert.equal(isAllowedImageSignature('image/jpeg', Uint8Array.from([0xff,0xd8,0xff,0x00])), true);
  assert.equal(isAllowedImageSignature('image/png', Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), true);
  assert.equal(isAllowedImageSignature('image/webp', Uint8Array.from([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50])), true);
  assert.equal(isAllowedImageSignature('image/png', Uint8Array.from([0xff,0xd8,0xff])), false);
  assert.equal(isAllowedImageSignature('image/svg+xml', Uint8Array.from([0x3c,0x73,0x76,0x67])), false);
});

test('payment proof bucket is private with student-owned and admin-only access', async () => {
  const migration = await read('supabase/migrations/0040_private_manual_payment_proofs.sql');
  assert.match(migration, /values \('payment-proofs', 'payment-proofs', false/);
  assert.match(migration, /file_size_limit = 3145728/);
  assert.match(migration, /students upload own unsubmitted payment proofs/);
  assert.match(migration, /admins read payment proofs/);
  const studentRead = await read('supabase/migrations/0042_students_read_own_payment_proofs.sql');
  assert.match(studentRead, /students read own payment proofs/);
  assert.match(migration, /current_role\(\).*admin/);
  const enforcement = await read('supabase/migrations/0041_enforce_payment_proof_ownership.sql');
  assert.match(enforcement, /security definer/i);
  assert.match(enforcement, /owner_id = auth\.uid\(\)::text/);
  assert.match(enforcement, /metadata->>'mimetype'/);
  assert.match(enforcement, /validate_manual_payment_proof_path/);
});

test('student payment form requires proof and server validates then uploads before insert', async () => {
  const student = await read('app/student/page.tsx');
  const action = await read('app/actions/payments.ts');
  assert.match(student, /name="payment_proof"/);
  assert.match(student, /type="file"/);
  assert.match(student, /required/);
  assert.match(action, /isAllowedImageSignature/);
  assert.match(action, /payment-proofs/);
  assert.match(action, /proof_storage_path/);
  assert.ok(action.indexOf(".upload(proofPath") < action.indexOf(".insert(submission)"));
});

test('admin creates short-lived signed URLs rather than public proof URLs', async () => {
  const admin = await read('app/admin/page.tsx');
  assert.match(admin, /createSignedUrl/);
  assert.match(admin, /proof_storage_path/);
  assert.doesNotMatch(admin, /getPublicUrl\(.*proof/i);
});
