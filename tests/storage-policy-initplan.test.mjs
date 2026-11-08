import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Storage role policies wrap current_role and public academy settings expose only the singleton row', async () => {
  const migration = await readFile(new URL('../supabase/migrations/0031_optimize_storage_rls_initplans_and_public_settings.sql', import.meta.url), 'utf8');
  assert.match(migration, /schemaname = 'storage'/);
  assert.match(migration, /replace\(new_qual, '"current_role"\(\)', '\(select public\.current_role\(\)\)'\)/);
  assert.match(migration, /replace\(new_check, '"current_role"\(\)', '\(select public\.current_role\(\)\)'\)/);
  assert.match(migration, /using \(id = 1\)/);
});
