import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('notification read state is one-way and database-timestamp bounded', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261109283000_guard_notification_read_state.sql', import.meta.url), 'utf8');
  assert.match(migration, /old\.read_at is not null/i);
  assert.match(migration, /new\.read_at is null/i);
  assert.match(migration, /new\.read_at > now\(\) \+ interval '30 seconds'/i);
  assert.match(migration, /before update of read_at on public\.notifications/i);
});
