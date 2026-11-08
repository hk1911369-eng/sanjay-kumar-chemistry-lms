import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('database URL and sender phone constraints are represented in migrations', async () => {
  const migration = await readFile(new URL('../supabase/migrations/0048_align_video_and_sender_phone_constraints.sql', import.meta.url), 'utf8');
  assert.match(migration, /lessons_video_url_https_check/);
  assert.match(migration, /video_url is null or video_url ~\* '\^https:\/\/'/);
  assert.match(migration, /manual_payment_sender_phone_format/);
  assert.match(migration, /sender_phone is null or sender_phone ~ '\^01\[3-9\]\[0-9\]\{8\}\$'/);
  assert.match(migration, /if not exists/);
});

test('student submission policies require an active student role', async () => {
  const migration = await readFile(new URL('../supabase/migrations/0049_student_submission_role_guards.sql', import.meta.url), 'utf8');
  for (const policy of [
    'students submit own assignments',
    'students update own ungraded submissions',
    'students submit own course applications',
    'students manage own lesson bookmarks',
    'students manage own enrolled lesson progress',
    'students update own enrolled lesson progress',
    'student submits own manual payment',
    'students create own quiz attempts',
    'students submit written exams',
  ]) {
    assert.ok(migration.includes(policy), policy);
  }
  assert.equal((migration.match(/public\.current_role\(\)\) = 'student'/g) ?? []).length, 12);
  assert.ok(migration.includes('to authenticated'));
  assert.equal(migration.includes('to public'), false);
});
