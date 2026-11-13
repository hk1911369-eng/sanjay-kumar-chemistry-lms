import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('payment ledger and quiz scoring state are not client-writable', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109282000_revoke_client_payment_and_quiz_mutations.sql', import.meta.url), 'utf8');
  assert.match(migration, /revoke insert, update, delete on table public\.payment_orders from authenticated/i);
  assert.match(migration, /revoke insert, update, delete on table public\.payment_events from authenticated/i);
  assert.match(migration, /revoke update, delete on table public\.quiz_attempts from authenticated/i);
});
