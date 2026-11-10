import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('practical notebook tables deny all anonymous and PUBLIC table privileges', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110255400_revoke_anonymous_lab_notebook_access.sql', import.meta.url), 'utf8');
  for (const table of ['lab_notebook_entries','lab_notebook_evidence']) {
    assert.match(migration, new RegExp('revoke all on table public[.]' + table + ' from public, anon', 'i'));
  }
  assert.match(migration, /grant select, insert, update on table public\.lab_notebook_entries to authenticated/i);
  assert.match(migration, /grant select, insert on table public\.lab_notebook_evidence to authenticated/i);
});

test('practical notebook authorization remains limited to authenticated RLS policies', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110180000_add_lab_notebook_practical_assessment.sql', import.meta.url), 'utf8');
  const evidence = await readFile(new URL('../supabase/migrations/20261110233000_add_private_lab_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /for select to authenticated/i);
  assert.match(evidence, /enable row level security/i);
  assert.match(evidence, /for insert to authenticated/i);
});
