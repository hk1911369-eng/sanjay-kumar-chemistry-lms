import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('public registration never accepts a role and database provisioning fixes student role', async () => {
  const action = await read('app/actions/auth.ts');
  const trigger = await read('supabase/migrations/0005_auth_roles_and_course_guardrails.sql');
  assert.match(action, /data:\s*\{\s*full_name:\s*fullName,\s*phone\s*\}/);
  assert.doesNotMatch(action, /raw_user_meta_data|formData\.get\(['"]role['"]\)/);
  assert.match(trigger, /INSERT INTO public\.profiles\s*\(id, full_name, phone, role\)[\s\S]*'student'/i);
});

test('profile role and student identity cannot be self-edited', async () => {
  const migration = await read('supabase/migrations/20261108184125_restrict_profile_update_columns.sql');
  const roleMigration = await read('supabase/migrations/0005_auth_roles_and_course_guardrails.sql');
  assert.match(migration, /REVOKE UPDATE ON TABLE public\.profiles FROM authenticated/i);
  assert.match(migration, /GRANT UPDATE\s*\([\s\S]*full_name[\s\S]*\)\s*ON TABLE public\.profiles TO authenticated/i);
  assert.match(roleMigration, /prevent_self_role_change/);
  assert.match(roleMigration, /protect_student_identity_fields/);
});

test('admin CSV endpoints reject inactive accounts as well as non-admins', async () => {
  for (const path of ['app/api/admin/finance-export/route.ts', 'app/api/admin/student-export/route.ts']) {
    const route = await read(path);
    assert.match(route, /select\('role,is_active'\)/);
    assert.match(route, /actor\?\.role !== 'admin' \|\| actor\.is_active !== true/);
  }
});
