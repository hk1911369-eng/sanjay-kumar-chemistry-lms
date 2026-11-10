import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';

test('timestamped Supabase migrations use unique 14-digit versions', async () => {
  const files = await readdir(new URL('../supabase/migrations/', import.meta.url));
  const migrations = files
    .map(name => ({ name, version: name.match(/^(\d{14})_/ )?.[1] }))
    .filter(item => item.version);

  const byVersion = new Map();
  for (const migration of migrations) {
    const names = byVersion.get(migration.version) ?? [];
    names.push(migration.name);
    byVersion.set(migration.version, names);
  }

  const duplicates = [...byVersion.entries()].filter(([, names]) => names.length > 1);
  assert.deepEqual(duplicates, [], 'duplicate timestamped migration versions must be resolved before release');
});
