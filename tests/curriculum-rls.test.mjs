import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('teacher curriculum writes are draft-only at the RLS boundary', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110261000_make_teacher_curriculum_authoring_draft_only.sql', import.meta.url), 'utf8');
  assert.match(migration, /DROP POLICY IF EXISTS "assigned teachers and admins manage lessons"/);
  assert.match(migration, /DROP POLICY IF EXISTS "assigned teachers and admins manage chapters"/);
  assert.match(migration, /CREATE POLICY "admins manage lessons"[\s\S]*?FOR ALL[\s\S]*?current_role\(\).*?admin/s);
  assert.match(migration, /CREATE POLICY "admins manage chapters"[\s\S]*?FOR ALL[\s\S]*?current_role\(\).*?admin/s);
  for (const table of ['lessons', 'chapters']) {
    assert.match(migration, new RegExp('assigned teachers create draft ' + (table === 'lessons' ? 'lessons' : 'chapters')));
    assert.match(migration, new RegExp('assigned teachers update draft ' + (table === 'lessons' ? 'lessons' : 'chapters')));
  }
  assert.equal((migration.match(/is_published IS FALSE/g) ?? []).length, 3);
  assert.equal((migration.match(/published IS FALSE/g) ?? []).length, 6);
  assert.equal((migration.match(/a\.teacher_id = \(SELECT auth\.uid\(\)\)/g) ?? []).length, 4);
});
