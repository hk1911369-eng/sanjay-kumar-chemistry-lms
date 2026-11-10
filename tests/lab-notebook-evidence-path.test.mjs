import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('evidence filename policies and trigger match a literal extension dot', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261110255300_fix_lab_evidence_filename_validation.sql', import.meta.url),
    'utf8',
  );
  const expected = "\\.(jpg|png|webp|pdf)$";
  const incorrect = "\\\\.(jpg|png|webp|pdf)$";
  assert.equal(migration.split(expected).length - 1, 3);
  assert.equal(migration.includes(incorrect), false);
  assert.match(migration, /students attach evidence to editable own notebook/);
  assert.match(migration, /students upload own lab notebook evidence/);
  assert.match(migration, /guard_lab_notebook_evidence_insert/);
});

test('database regex matches the UUID filename plus one literal extension dot', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261110255300_fix_lab_evidence_filename_validation.sql', import.meta.url),
    'utf8',
  );
  const pattern = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp|pdf)$";
  assert.ok(migration.includes(pattern));
  assert.ok(!migration.includes("\\\\.(jpg|png|webp|pdf)$"));
});
