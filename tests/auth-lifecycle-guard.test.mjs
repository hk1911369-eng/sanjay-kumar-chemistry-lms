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
  const identityMigration = await read('supabase/migrations/20261108202657_fail_closed_student_identity_field_guard.sql');
  const studentCodeMigration = await read('supabase/migrations/20261110264000_pin_student_code_trigger_search_path.sql');
  assert.match(migration, /REVOKE UPDATE ON TABLE public\.profiles FROM authenticated/i);
  assert.match(migration, /GRANT UPDATE\s*\([\s\S]*full_name[\s\S]*\)\s*ON TABLE public\.profiles TO authenticated/i);
  assert.match(roleMigration, /prevent_self_role_change/);
  assert.match(identityMigration, /protect_student_identity_fields/);
  assert.match(studentCodeMigration, /SET\s+search_path\s+TO\s+'pg_catalog',\s*'public',\s*'pg_temp'/i);
  assert.match(studentCodeMigration, /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.assign_student_code\(\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated/i);
});

test('admin CSV endpoints reject inactive accounts as well as non-admins', async () => {
  for (const path of ['app/api/admin/finance-export/route.ts', 'app/api/admin/student-export/route.ts']) {
    const route = await read(path);
    assert.match(route, /select\('role,is_active'\)/);
    assert.match(route, /actor\?\.role !== 'admin' \|\| actor\.is_active !== true/);
  }
});

test('server actions reject inactive actors before privileged workflows', async () => {
  const paths = [
    'app/actions/academic.ts',
    'app/actions/academy-settings.ts',
    'app/actions/course-application.ts',
    'app/actions/course-studio.ts',
    'app/actions/finance.ts',
    'app/actions/lab-notebook-evidence.ts',
    'app/actions/lab-notebooks.ts',
    'app/actions/lab-practical-assignments.ts',
    'app/actions/learning-os.ts',
    'app/actions/learning.ts',
    'app/actions/payments.ts',
    'app/actions/student-management.ts',
    'app/actions/student-practice-authoring.ts',
    'app/actions/teacher-learning.ts',
    'app/actions/virtual-labs.ts',
  ];

  for (const path of paths) {
    const action = await read(path);
    if (/from\(['"]profiles['"]\)[\s\S]{0,80}select\(['"]role/.test(action)) {
      assert.match(action, /select\(['"]role,is_active['"]\)/, path);
      assert.match(action, /is_active\s*!==\s*true/, path);
    }
  }
});
