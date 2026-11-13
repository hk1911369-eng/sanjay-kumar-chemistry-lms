import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('discussion reply parent validation uses a non-recursive private helper', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110268000_fix_discussion_parent_policy_recursion.sql', import.meta.url), 'utf8');

  assert.ok(migration.includes('CREATE OR REPLACE FUNCTION private.lesson_discussion_parent_is_root('));
  assert.ok(migration.includes('  p_parent_id uuid,\n  p_lesson_id uuid'));
  assert.ok(migration.includes('RETURNS boolean'));
  assert.ok(migration.includes('STABLE'));
  assert.ok(migration.includes('SECURITY DEFINER'));
  assert.ok(migration.includes("SET search_path TO ''"));
  assert.ok(migration.includes('FROM public.lesson_discussions AS parent'));
  assert.ok(migration.includes('WHERE parent.id = p_parent_id'));
  assert.ok(migration.includes('AND parent.lesson_id = p_lesson_id'));
  assert.ok(migration.includes('AND parent.parent_id IS NULL'));
  assert.ok(migration.includes('REVOKE ALL ON FUNCTION private.lesson_discussion_parent_is_root(uuid, uuid)'));
  assert.ok(migration.includes('FROM PUBLIC, anon, authenticated'));
  assert.ok(migration.includes('GRANT EXECUTE ON FUNCTION private.lesson_discussion_parent_is_root(uuid, uuid)'));
  assert.ok(migration.includes('parent_id IS NULL\n    OR private.lesson_discussion_parent_is_root(parent_id, lesson_id)'));
  assert.equal(migration.includes('FROM public.lesson_discussions parent'), false);
  assert.equal(migration.includes('TRUNCATE TABLE'), false);
  assert.equal(migration.includes('DROP TABLE'), false);
});
