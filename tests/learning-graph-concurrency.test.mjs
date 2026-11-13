import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('prerequisite graph writes serialize per subject before cycle validation', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110142000_serialize_learning_graph_and_guard_parent_cycles.sql', import.meta.url), 'utf8');
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(v_concept_subject::text, 0\)\)/);
  assert.match(migration, /Re-read after obtaining the lock/);
  assert.match(migration, /WITH RECURSIVE reachable/);
  assert.match(migration, /Prerequisite relationship would create a cycle/);
  assert.match(migration, /SET search_path = pg_catalog, public, pg_temp/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.guard_concept_prerequisite_edge\(\) FROM PUBLIC, anon, authenticated/);
});

test('concept parent hierarchy rejects self, cross-subject, and indirect cycles', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110142000_serialize_learning_graph_and_guard_parent_cycles.sql', import.meta.url), 'utf8');
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.guard_concept_parent_edge/);
  assert.match(migration, /NEW\.parent_id = NEW\.id/);
  assert.match(migration, /Parent and child concepts must belong to the same subject/);
  assert.match(migration, /WITH RECURSIVE ancestors/);
  assert.match(migration, /Concept hierarchy would create a cycle/);
  assert.match(migration, /BEFORE INSERT OR UPDATE OF parent_id, subject_id ON public\.learning_concepts/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.guard_concept_parent_edge\(\) FROM PUBLIC, anon, authenticated/);
});

test('concept subject identity cannot silently invalidate graph edges', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110142000_serialize_learning_graph_and_guard_parent_cycles.sql', import.meta.url), 'utf8');
  assert.match(migration, /NEW\.subject_id IS DISTINCT FROM OLD\.subject_id/);
  assert.match(migration, /A concept subject is immutable/);
});

test('graph integrity functions are database triggers, not client-callable RPCs', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110142000_serialize_learning_graph_and_guard_parent_cycles.sql', import.meta.url), 'utf8');
  assert.match(migration, /CREATE TRIGGER guard_concept_parent_edge/);
  assert.match(migration, /FOR EACH ROW EXECUTE FUNCTION public\.guard_concept_parent_edge\(\)/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.guard_concept_prerequisite_edge\(\) FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.guard_concept_parent_edge\(\) FROM PUBLIC, anon, authenticated/);
});
