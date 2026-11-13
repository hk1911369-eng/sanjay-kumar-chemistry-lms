import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('quiz attempts cannot be backdated into a future start or opened outside the quiz window', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109140000_harden_quiz_attempt_start_time.sql', import.meta.url), 'utf8');
  assert.match(migration, /drop policy if exists "students create own quiz attempts"/i);
  assert.match(migration, /started_at <= now\(\) \+ interval '30 seconds'/i);
  assert.match(migration, /q\.starts_at is null or q\.starts_at <= now\(\)/i);
  assert.match(migration, /q\.ends_at is null or q\.ends_at >= now\(\)/i);
  assert.match(migration, /answers = '\{\}'::jsonb/i);
  assert.match(migration, /total_marks is null/i);
  assert.match(migration, /e\.admission_fee_paid is true/i);
  assert.match(migration, /e\.paid_through >=/i);
});
