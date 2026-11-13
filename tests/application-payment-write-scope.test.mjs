import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('application and payment submissions cannot forge review metadata or creation timestamps', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109230000_scope_application_and_payment_writes.sql', import.meta.url), 'utf8');
  assert.match(migration, /revoke insert, update on table public\.course_applications from authenticated/i);
  assert.match(migration, /grant insert \([\s\S]*student_note[\s\S]*\) on table public\.course_applications/i);
  assert.match(migration, /grant update \(status, admin_note, reviewed_by, reviewed_at, updated_at\)/i);
  assert.match(migration, /revoke insert on table public\.manual_payment_submissions from authenticated/i);
  assert.match(migration, /grant insert \([\s\S]*proof_storage_path[\s\S]*fee_admission_bdt[\s\S]*\) on table public\.manual_payment_submissions/i);
});
