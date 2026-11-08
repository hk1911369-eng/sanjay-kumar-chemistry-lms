import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('anonymous users can read published courses but not private course assignment/profile tables', async () => {
  const migration = await readFile(new URL('../supabase/migrations/0033_public_published_course_access.sql', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/courses/[slug]/page.tsx', import.meta.url), 'utf8');
  assert.match(migration, /grant select on public\.courses to anon/i);
  assert.match(migration, /for select\s+to anon\s+using \(is_published is true and archived_at is null\)/i);
  assert.match(migration, /create or replace function public\.get_public_course_teachers/);
  assert.match(migration, /c\.is_published is true/);
  assert.match(migration, /c\.archived_at is null/);
  assert.match(migration, /grant execute on function public\.get_public_course_teachers\(uuid\) to anon, authenticated/i);
  assert.match(page, /rpc\('get_public_course_teachers'/);
  assert.doesNotMatch(page, /from\('course_assignments'\)/);
  assert.doesNotMatch(page, /from\('profiles'\)/);
});
