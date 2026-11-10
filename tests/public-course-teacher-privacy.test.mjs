import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public course teacher listing exposes only active assigned staff names', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110115928_filter_inactive_public_course_teachers.sql', import.meta.url), 'utf8');
  assert.match(migration, /RETURNS TABLE\(id uuid, full_name text\)/);
  assert.match(migration, /c\.is_published IS TRUE/);
  assert.match(migration, /c\.archived_at IS NULL/);
  assert.match(migration, /p\.role::text IN \('teacher', 'staff'\)/);
  assert.match(migration, /p\.is_active IS TRUE/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_public_course_teachers\(uuid\) TO anon, authenticated/);
});
