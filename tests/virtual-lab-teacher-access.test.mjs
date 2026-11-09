import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('assigned teachers can read only published experiments mapped to their assigned courses', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110243000_scope_teacher_virtual_lab_catalogue_read.sql', import.meta.url), 'utf8');
  assert.match(migration, /create policy "virtual lab catalogue scoped read"[\s\S]*for select/i);
  assert.match(migration, /current_role\(\)\) in \('teacher'::public\.app_role,'staff'::public\.app_role\)/i);
  assert.match(migration, /is_published is true/i);
  assert.match(migration, /cs\.subject_id = virtual_lab_catalog\.subject_id/i);
  assert.match(migration, /ca\.teacher_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /cs\.course_id = ca\.course_id/i);
});

test('admin catalogue writes remain explicitly role-restricted without overlapping SELECT policies', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110243000_scope_teacher_virtual_lab_catalogue_read.sql', import.meta.url), 'utf8');
  assert.match(migration, /create policy "admins insert virtual lab catalogue"[\s\S]*for insert/i);
  assert.match(migration, /create policy "admins update virtual lab catalogue"[\s\S]*for update/i);
  assert.match(migration, /create policy "admins delete virtual lab catalogue"[\s\S]*for delete/i);
  assert.doesNotMatch(migration, /create policy "admins manage virtual lab catalogue"[\s\S]*for all/i);
  assert.match(migration, /drop policy if exists "paid students read mapped virtual lab catalogue"/i);
});
