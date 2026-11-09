import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('discussion pinning is a staff-only moderation RPC, not a direct author column write', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109281000_secure_discussion_pinning.sql', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/learning.ts', import.meta.url), 'utf8');
  assert.match(migration, /revoke update \(is_pinned\) on table public\.lesson_discussions from authenticated/i);
  assert.match(migration, /v_role not in \('admin'::public\.app_role, 'teacher'::public\.app_role, 'staff'::public\.app_role\)/i);
  assert.match(migration, /course_assignments a[\s\S]*a\.teacher_id = v_user_id/i);
  assert.match(migration, /grant execute on function public\.set_lesson_discussion_pin/i);
  assert.match(action, /rpc\('set_lesson_discussion_pin'/i);
  assert.doesNotMatch(action, /from\('lesson_discussions'\)\.update\(\{ is_pinned:/i);
});
