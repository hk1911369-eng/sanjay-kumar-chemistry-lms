import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('student study goals are limited to valid weekly lesson-completion targets', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109240000_scope_student_study_goal_creation.sql', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/learning.ts', import.meta.url), 'utf8');
  assert.match(migration, /goal_type = 'lesson_completions'/i);
  assert.match(migration, /target_value > 0/i);
  assert.match(migration, /target_value <= 100000/i);
  assert.match(migration, /period_end = \(\(now\(\) at time zone 'Asia\/Dhaka'\)::date \+ 6\)/i);
  assert.match(migration, /grant insert \(student_id, course_id, goal_type, target_value, period_start, period_end\)/i);
  assert.doesNotMatch(action, /current_value:\s*0/);
});
