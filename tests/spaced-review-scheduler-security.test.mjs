import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261111140000_harden_spaced_review_scheduler.sql', import.meta.url), 'utf8');

test('spaced review scheduler runs with a hardened definer context', () => {
  assert.match(migration, /ALTER FUNCTION public\.schedule_revision_after_mastery_update\(\) SECURITY DEFINER/i);
  assert.match(migration, /ALTER FUNCTION public\.schedule_revision_after_mastery_update\(\) SET search_path = ''/i);
});
