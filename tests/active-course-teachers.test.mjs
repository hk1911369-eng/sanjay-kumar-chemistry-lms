import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('new course assignments must target an active teacher or staff profile', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113150000_require_active_course_teachers.sql', import.meta.url), 'utf8');
  const trigger = migration.split('CREATE OR REPLACE FUNCTION public.validate_course_assignment_teacher')[1]
    .split('CREATE OR REPLACE FUNCTION public.get_public_course_teachers')[0];
  assert.match(trigger, /p\.role::text IN \('teacher', 'staff'\)/i);
  assert.match(trigger, /p\.is_active IS TRUE/i);
  assert.match(trigger, /USING ERRCODE = '23514'/i);
});

test('public course teacher directory excludes inactive profiles and unpublished or archived courses', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113150000_require_active_course_teachers.sql', import.meta.url), 'utf8');
  const directory = migration.split('CREATE OR REPLACE FUNCTION public.get_public_course_teachers')[1];
  assert.match(directory, /c\.is_published IS TRUE/i);
  assert.match(directory, /c\.archived_at IS NULL/i);
  assert.match(directory, /p\.role::text IN \('teacher', 'staff'\)/i);
  assert.match(directory, /p\.is_active IS TRUE/i);
});

test('migration changes only the authorization functions and does not rewrite existing course assignments', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113150000_require_active_course_teachers.sql', import.meta.url), 'utf8');
  assert.equal(/DELETE\s+FROM\s+public\.course_assignments/i.test(migration), false);
  assert.equal(/UPDATE\s+public\.course_assignments/i.test(migration), false);
  assert.match(migration, /Source-only until reviewed and applied through the isolated JMT Test workflow/i);
});
