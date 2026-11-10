import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('course subjects remain public for published courses but private membership requires active roles', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261110274000_require_active_role_for_course_subject_reads.sql', import.meta.url), 'utf8');
  assert.match(sql, /current_role\(\)\)::text = 'admin'/i);
  assert.match(sql, /c\.is_published IS TRUE[\s\S]*?c\.archived_at IS NULL/i);
  assert.match(sql, /current_role\(\)\)::text IN \('teacher','staff'\)[\s\S]*?course_assignments/i);
  assert.match(sql, /current_role\(\)\) = 'student'::public\.app_role[\s\S]*?e\.status = 'active'/i);
  assert.match(sql, /e\.admission_fee_paid IS TRUE/i);
  assert.match(sql, /e\.paid_through >=/i);
  assert.match(sql, /c\.archived_at IS NULL/i);
  assert.doesNotMatch(sql, /DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM/i);
});
