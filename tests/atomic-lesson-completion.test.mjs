import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('lesson completion uses one atomic server-validated database operation', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110140000_atomic_lesson_completion_rpc.sql', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/learning.ts', import.meta.url), 'utf8');
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = pg_catalog, public, pg_temp/i);
  assert.match(migration, /auth\.uid\(\)/i);
  assert.match(migration, /current_role\(\).*student/i);
  assert.match(migration, /admission_fee_paid is true/i);
  assert.match(migration, /paid_through >= v_month_end/i);
  assert.match(migration, /on conflict \(student_id, lesson_id\) do update/i);
  assert.match(migration, /on conflict \(student_id, lesson_id\)[\s\S]*do nothing/i);
  assert.match(migration, /revoke all on function public\.record_lesson_completion/i);
  assert.match(migration, /grant execute on function public\.record_lesson_completion/i);
  const start = action.indexOf('export async function markLessonComplete');
  const end = action.indexOf('\nexport async function assignTeacher', start);
  const handler = action.slice(start, end);
  assert.match(handler, /rpc\('record_lesson_completion'/);
  assert.doesNotMatch(handler, /from\('lesson_progress'\)\.(insert|update)/);
  assert.doesNotMatch(handler, /from\('learning_events'\)\.insert/);
});
