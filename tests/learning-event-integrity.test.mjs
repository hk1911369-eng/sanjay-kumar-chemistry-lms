import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('student learning events are time-bounded, narrowly writable and idempotent', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109190000_harden_learning_event_integrity.sql', import.meta.url), 'utf8');
  assert.match(migration, /occurred_at >= now\(\) - interval '10 minutes'/i);
  assert.match(migration, /occurred_at <= now\(\) \+ interval '30 seconds'/i);
  assert.match(migration, /revoke insert on table public\.learning_events from authenticated/i);
  assert.match(migration, /grant insert \(student_id, course_id, lesson_id, concept_id, event_type, occurred_at\)/i);
  assert.match(migration, /create unique index if not exists learning_events_one_lesson_completion_per_student/i);
  assert.match(migration, /where event_type = 'lesson_completed' and lesson_id is not null/i);
});
