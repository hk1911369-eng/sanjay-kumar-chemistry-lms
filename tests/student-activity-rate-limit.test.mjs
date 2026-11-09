import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('student activity throttles are enforced inside PostgreSQL and discussion metadata is server-owned', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109260000_enforce_student_activity_rate_limits.sql', import.meta.url), 'utf8');
  assert.match(migration, /lesson_discussions[\s\S]*created_at > now\(\) - v_window/i);
  assert.match(migration, /manual_payment_submissions[\s\S]*v_limit := 3/i);
  assert.match(migration, /learning_events[\s\S]*v_limit := 60/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /before insert on public\.lesson_discussions/i);
  assert.match(migration, /before insert on public\.manual_payment_submissions/i);
  assert.match(migration, /before insert on public\.learning_events/i);
  assert.match(migration, /grant insert \(lesson_id, course_id, parent_id, author_id, body\)/i);
  assert.match(migration, /grant update \(body, is_pinned\)/i);
});
