import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('published lesson concept mappings cannot be changed by assigned teachers', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110120500_lock_published_lesson_concept_links.sql', import.meta.url), 'utf8');
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\\.enforce_lesson_concept_draft_integrity/);
  assert.match(migration, /l\\.is_published/);
  assert.match(migration, /Concept links for published lessons are locked/);
  assert.match(migration, /v_published IS NULL AND TG_OP <> 'DELETE'/);
  assert.match(migration, /NEW\\.lesson_id IS DISTINCT FROM OLD\\.lesson_id/);
  assert.match(migration, /BEFORE INSERT OR UPDATE OR DELETE ON public\\.lesson_concepts/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\\.enforce_lesson_concept_draft_integrity\\(\\) FROM PUBLIC, anon, authenticated/);
});
