import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('nullable active-role checks fail closed across lesson, curriculum and practical writes', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110266000_fail_closed_null_role_guards.sql', import.meta.url), 'utf8');

  assert.match(migration, /public\.current_role\(\) IS DISTINCT FROM 'student'::public\.app_role/i);
  assert.doesNotMatch(migration, /public\.current_role\(\)::text\s*<>\s*'student'/i);

  assert.match(migration, /v_role IS NULL OR v_role NOT IN \('teacher', 'staff'\)/i);
  assert.match(migration, /IF v_role IS NULL OR v_role NOT IN \('teacher', 'staff'\)/i);

  assert.match(migration, /auth\.uid\(\) IS NULL[\s\S]*?v_role IS NULL[\s\S]*?v_role NOT IN \('admin'::public\.app_role, 'teacher'::public\.app_role, 'staff'::public\.app_role\)/i);
  assert.match(migration, /IF v_role IS NULL THEN[\s\S]*?Not authorised to update this practical assignment/i);
  assert.match(migration, /v_role IS DISTINCT FROM 'admin'::public\.app_role[\s\S]*?v_role NOT IN \('teacher'::public\.app_role, 'staff'::public\.app_role\)/i);

  assert.equal((migration.match(/SET search_path TO 'pg_catalog', 'public', 'pg_temp'/gi) ?? []).length, 4);
  assert.match(migration, /SECURITY DEFINER[\s\S]*?record_lesson_completion/i);
  assert.match(migration, /SECURITY INVOKER[\s\S]*?enforce_lesson_concept_draft_integrity/i);
  assert.match(migration, /SECURITY INVOKER[\s\S]*?enforce_teacher_curriculum_draft_integrity/i);
  assert.match(migration, /SECURITY DEFINER[\s\S]*?guard_lab_practical_assignment_write/i);

  for (const fn of [
    'enforce_lesson_concept_draft_integrity',
    'enforce_teacher_curriculum_draft_integrity',
    'guard_lab_practical_assignment_write',
  ]) {
    assert.match(migration, new RegExp('REVOKE ALL ON FUNCTION public\\.' + fn + '\\(\\) FROM PUBLIC, anon, authenticated', 'i'));
  }

  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM/i);
});
