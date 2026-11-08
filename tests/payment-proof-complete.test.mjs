import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('payment proof trigger validates real object ownership, MIME and size', async () => {
  const migration = await read('supabase/migrations/0044_complete_payment_proof_ownership.sql');
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /storage\.objects/);
  assert.match(migration, /o\.owner = auth\.uid\(\) or o\.owner_id = auth\.uid\(\)::text/);
  assert.match(migration, /metadata->>'mimetype' in \('image\/jpeg','image\/png','image\/webp'\)/);
  assert.match(migration, /v_size::bigint > 3145728/);
  assert.match(migration, /revoke all on function public\.validate_manual_payment_proof_path/);
});

test('students can read only their own private payment proof objects', async () => {
  const migration = await read('supabase/migrations/0044_complete_payment_proof_ownership.sql');
  assert.match(migration, /students read own payment proofs/);
  assert.match(migration, /storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/);
  assert.match(migration, /current_role\(\)\)::text = 'student'/);
});

test('payment proof upload and student history remain wired', async () => {
  const action = await read('app/actions/payments.ts');
  const student = await read('app/student/page.tsx');
  assert.match(action, /randomUUID/);
  assert.match(action, /proof_upload_failed/);
  assert.match(action, /proof_storage_path/);
  assert.match(student, /proof_upload_failed/);
  assert.match(student, /proof_storage_path/);
  assert.match(student, /<th>Proof<\/th>/);
});
