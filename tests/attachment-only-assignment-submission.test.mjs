import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('attachment-only assignment submissions pass nullable answer checks safely', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110130000_allow_attachment_only_assignment_submissions.sql', import.meta.url), 'utf8');
  assert.equal((migration.match(/coalesce\(length\(answer_text\), 0\) <= 12000/gi) || []).length, 2);
  assert.equal((migration.match(/coalesce\(length\(answer_text\), 0\) > 0 or attachment_url is not null/gi) || []).length, 2);
  assert.match(migration, /drop policy if exists "students submit own assignments"/i);
  assert.match(migration, /drop policy if exists "students update own ungraded submissions"/i);
  assert.match(migration, /e\.admission_fee_paid is true/i);
  assert.match(migration, /e\.paid_through >=/i);
});
