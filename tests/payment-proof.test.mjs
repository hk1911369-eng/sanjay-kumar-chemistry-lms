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
  assert.ok(migration.includes("'payment-proofs'"));
  assert.ok(migration.includes("public = false"));
  assert.ok(migration.includes("file_size_limit = 3145728"));
  assert.ok(migration.includes("students upload own unsubmitted payment proofs"));
  assert.ok(migration.includes("admins read payment proofs"));
  assert.ok(migration.includes("current_role())::text = 'admin'"));
  const studentRead = await read('supabase/migrations/0042_students_read_own_payment_proofs.sql');
  assert.ok(studentRead.includes("students read own payment proofs"));
  const enforcement = await read('supabase/migrations/0041_enforce_payment_proof_ownership.sql');
  assert.ok(enforcement.toLowerCase().includes("security definer"));
  assert.ok(enforcement.includes("owner_id = auth.uid()::text"));
  assert.ok(enforcement.includes("metadata->>'mimetype'"));
  assert.ok(enforcement.includes("validate_manual_payment_proof_path"));
  const finalEnforcement = await read('supabase/migrations/0044_complete_payment_proof_ownership.sql');
  assert.ok(finalEnforcement.includes("set search_path = ''"));
  assert.ok(finalEnforcement.includes("owner_id = auth.uid()::text"));
  assert.ok(finalEnforcement.includes("metadata->>'mimetype'"));
  assert.ok(finalEnforcement.includes("v_size::bigint > 3145728"));
  assert.ok(finalEnforcement.includes("revoke all on function public.validate_manual_payment_proof_path"));
});

test('student payment form requires proof and server validates then uploads before insert', async () => {
  const student = await read('app/student/page.tsx');
  const action = await read('app/actions/payments.ts');
  assert.ok(student.includes('name="payment_proof"'));
  assert.ok(student.includes('type="file"'));
  assert.ok(student.includes('required'));
  assert.ok(action.includes("proof.size < 12"));
  assert.ok(action.includes("isAllowedImageSignature"));
  assert.ok(action.includes("payment-proofs"));
  assert.ok(action.includes("proof_storage_path"));
  assert.ok(action.indexOf(".upload(proofPath") < action.indexOf(".insert(submission)"));
});

test('admin creates batched short-lived signed URLs rather than public proof URLs', async () => {
  const admin = await read('app/admin/page.tsx');
  assert.ok(admin.includes("createSignedUrls"));
  assert.ok(admin.includes("proof_storage_path"));
  assert.equal(admin.includes("getPublicUrl("), false);
});
