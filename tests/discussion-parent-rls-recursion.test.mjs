import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('discussion reply parent validation uses a non-recursive private helper', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110268000_fix_discussion_parent_policy_recursion.sql', import.meta.url), 'utf8');

  assert.match(migration, /CREATE OR REPLACE FUNCTION private\.lesson_discussion_parent_is_root\(p_parent_id uuid,\s*p_lesson_id uuid\)/i);
  assert.match(migration, /RETURNS boolean[\s\S]*?STABLE[\s\S]*?SECURITY DEFINER/i);
  assert.match(migration, /SET search_path TO ''/i);
  assert.match(migration, /FROM public\.lesson_discussions AS parent[\s\S]*?parent\.id = p_parent_id[\s\S]*?parent\.lesson_id = p_lesson_id[\s\S]*?parent\.parent_id IS NULL/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION private\.lesson_discussion_parent_is_root\(uuid, uuid\)\s+FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION private\.lesson_discussion_parent_is_root\(uuid, uuid\)\s+TO authenticated/i);

  assert.match(migration, /parent_id IS NULL\s+OR private\.lesson_discussion_parent_is_root\(parent_id, lesson_id\)/i);
  assert.doesNotMatch(migration, /parent_id IS NULL\s+OR EXISTS\s*\(\s*SELECT 1 FROM public\.lesson_discussions parent/i);
  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM/i);
});
