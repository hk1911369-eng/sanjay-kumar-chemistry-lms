import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('database requires an uploaded private proof owned by the submitting student', async () => {
  const migration = await read('supabase/migrations/0042_verify_payment_proof_ownership.sql');
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /storage\.objects/);
  assert.match(migration, /bucket_id = 'payment-proofs'/);
  assert.match(migration, /o\.owner = auth\.uid\(\)/);
  assert.match(migration, /o\.owner_id = auth\.uid\(\)::text/);
  assert.match(migration, /revoke all on function public\.validate_manual_payment_proof_path/);
});
