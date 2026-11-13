import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('discussion RLS denies inactive accounts while preserving active student and assigned staff access', async () => {
  const migration = await read('supabase/migrations/20261110267000_require_active_profiles_for_discussions_and_storage.sql');

  assert.match(migration, /course members read lesson discussions[\s\S]*?current_role\(\)\) = 'student'::public\.app_role/i);
  assert.match(migration, /course members post lesson discussions[\s\S]*?current_role\(\)\) = 'student'::public\.app_role/i);
  assert.match(migration, /authors and assigned teachers update discussion body or pin[\s\S]*?current_role\(\)\) IS NOT NULL/i);
  assert.match(migration, /authors and admins delete discussions[\s\S]*?current_role\(\)\) IS NOT NULL/i);
  assert.match(migration, /teacher'\s*,\s*'staff'[\s\S]*?course_assignments/i);
  assert.match(migration, /admission_fee_paid IS TRUE/i);
  assert.match(migration, /paid_through >=/i);
  assert.match(migration, /parent_id IS NULL[\s\S]*?parent\.parent_id IS NULL/i);
});

test('discussion trigger explicitly rejects inactive sessions and retains author-only text edits and staff pin moderation', async () => {
  const migration = await read('supabase/migrations/20261110267000_require_active_profiles_for_discussions_and_storage.sql');
  assert.match(migration, /guard_lesson_discussion_fields\(\)[\s\S]*?auth\.uid\(\) IS NULL OR v_role IS NULL/i);
  assert.match(migration, /v_role NOT IN \('admin','teacher','staff','student'\)/i);
  assert.match(migration, /NEW\.body IS DISTINCT FROM OLD\.body[\s\S]*?OLD\.author_id IS DISTINCT FROM auth\.uid\(\)/i);
  assert.match(migration, /Only assigned teachers and admins can pin discussions/i);
  assert.match(migration, /SET search_path TO 'pg_catalog', 'public', 'pg_temp'/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.guard_lesson_discussion_fields\(\) FROM PUBLIC, anon, authenticated/i);
});

test('discussion reactions require active course membership for read, insert and remove', async () => {
  const migration = await read('supabase/migrations/20261110267000_require_active_profiles_for_discussions_and_storage.sql');
  assert.match(migration, /course members read discussion reactions[\s\S]*?current_role\(\)\) = 'student'::public\.app_role/i);
  assert.match(migration, /course members add own discussion reactions[\s\S]*?current_role\(\)\) = 'student'::public\.app_role/i);
  assert.match(migration, /users remove own discussion reactions[\s\S]*?current_role\(\)\) IS NOT NULL/i);
  assert.match(migration, /user_id = \(SELECT auth\.uid\(\)\)/i);
});

test('notification inbox and owner-scoped storage actions require an active profile', async () => {
  const migration = await read('supabase/migrations/20261110267000_require_active_profiles_for_discussions_and_storage.sql');
  assert.match(migration, /users read own notifications[\s\S]*?current_role\(\)\) IS NOT NULL/i);
  assert.match(migration, /users mark own notifications read[\s\S]*?current_role\(\)\) IS NOT NULL/i);
  assert.match(migration, /course members read lesson materials[\s\S]*?current_role\(\)\) = 'student'::public\.app_role/i);
  assert.match(migration, /student avatar owner upload[\s\S]*?current_role\(\)\) IS NOT NULL/i);
  assert.match(migration, /student avatar owner update[\s\S]*?current_role\(\)\) IS NOT NULL/i);
  assert.match(migration, /student avatar owner delete[\s\S]*?current_role\(\)\) IS NOT NULL/i);
  assert.match(migration, /student avatar scoped read[\s\S]*?current_role\(\)\) IS NOT NULL/i);
  assert.match(migration, /students remove unsubmitted own payment proofs[\s\S]*?current_role\(\)\) = 'student'::public\.app_role/i);
  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM/i);
});
