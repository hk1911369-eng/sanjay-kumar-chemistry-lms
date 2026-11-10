import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('ordinary API roles cannot bypass RLS with TRUNCATE or install table triggers', async () => {
  const migration = await read('supabase/migrations/20261110263000_revoke_client_truncate_and_trigger.sql');
  assert.match(migration, /REVOKE\s+TRUNCATE\s*,\s*TRIGGER\s+ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+public\s+FROM\s+anon\s*,\s*authenticated/i);
  assert.match(migration, /ALTER\s+DEFAULT\s+PRIVILEGES\s+FOR\s+ROLE\s+postgres\s+IN\s+SCHEMA\s+public[\s\S]*REVOKE\s+TRUNCATE\s*,\s*TRIGGER\s+ON\s+TABLES\s+FROM\s+anon\s*,\s*authenticated/i);
  assert.match(migration, /ALTER\s+DEFAULT\s+PRIVILEGES\s+FOR\s+ROLE\s+supabase_admin\s+IN\s+SCHEMA\s+public[\s\S]*REVOKE\s+TRUNCATE\s*,\s*TRIGGER\s+ON\s+TABLES\s+FROM\s+anon\s*,\s*authenticated/i);
  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM/i);
});
