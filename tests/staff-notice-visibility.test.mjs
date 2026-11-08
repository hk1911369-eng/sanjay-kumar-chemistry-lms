import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('staff-only notice visibility includes the staff role', async () => {
  const migration = await readFile(new URL('../supabase/migrations/0043_staff_notice_visibility.sql', import.meta.url), 'utf8');
  assert.match(migration, /array\['teacher','staff','admin'\]/);
  assert.match(migration, /revoke all on function public\.is_staff\(\) from public, anon/i);
  assert.match(migration, /grant execute on function public\.is_staff\(\) to authenticated/i);
});
