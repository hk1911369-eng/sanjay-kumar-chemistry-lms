import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('students receive enabled wallet instructions only through a student-role RPC', async () => {
  const migration = await read('supabase/migrations/0032_student_payment_instructions_rpc.sql');
  const page = await read('app/student/page.tsx');
  const action = await read('app/actions/payments.ts');
  assert.match(migration, /drop policy if exists "students and admins view payment instructions"/);
  assert.match(migration, /public\.current_role\(\) is distinct from 'student'/);
  assert.match(migration, /where s\.is_enabled is true/);
  assert.match(migration, /revoke all on function public\.get_enabled_payment_instructions\(\) from public, anon/i);
  assert.match(page, /rpc\('get_enabled_payment_instructions'\)/);
  assert.match(action, /rpc\('get_enabled_payment_instructions'\)/);
  assert.doesNotMatch(page, /from\('private_payment_settings'\)/);
  assert.doesNotMatch(action, /from\('private_payment_settings'\).*select/);
});
