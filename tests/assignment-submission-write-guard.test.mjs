import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('assignment submissions enforce answer bounds and database-owned submission timestamps', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109280000_harden_assignment_submission_writes.sql', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/academic.ts', import.meta.url), 'utf8');
  assert.match(migration, /length\(answer_text\) <= 12000/i);
  assert.match(migration, /length\(attachment_url\) <= 2048/i);
  assert.match(migration, /grant insert \(assignment_id, student_id, answer_text, attachment_url\)/i);
  assert.match(migration, /grant update \(answer_text, attachment_url\)/i);
  assert.doesNotMatch(action.slice(action.indexOf('export async function submitAssignment'), action.indexOf('export async function gradeAssignment')), /submitted_at:/);
});
