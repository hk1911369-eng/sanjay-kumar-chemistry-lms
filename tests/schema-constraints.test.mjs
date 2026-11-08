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
