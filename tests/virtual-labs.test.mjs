import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('virtual labs require an active paid student enrollment', async () => {
  const page = await readFile(new URL('../app/labs/page.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes("profile?.role !== 'student'"));
  assert.ok(page.includes(".eq('status', 'active')"));
  assert.ok(page.includes(".eq('admission_fee_paid', true)"));
  assert.ok(page.includes(".gte('paid_through', periodEnd)"));
});

test('virtual lab simulations cover multiple subjects and are interactive', async () => {
  const source = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  for (const subject of ['Physics','Chemistry','Biology','Mathematics','ICT']) assert.ok(source.includes(subject));
  for (const id of ['physics','chemistry','biology','maths','ict']) assert.ok(source.includes("id: '"+id+"'"));
  assert.ok(source.includes('onChange='));
  assert.ok(source.includes('Educational simulations only'));
  assert.ok(source.includes('visibleLabs'));
  assert.ok(source.includes('selectedCourses'));
});

test('virtual lab completion is recorded through a paid-enrollment-checked database RPC', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108215559_learning_os_record_virtual_lab_completion.sql', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8');
  const component = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  assert.ok(migration.includes("'simulation_completed'"));
  assert.ok(migration.includes("public.current_role() IS DISTINCT FROM 'student'::public.app_role"));
  assert.ok(migration.includes('e.admission_fee_paid IS TRUE'));
  assert.ok(migration.includes('e.paid_through>=v_period_end'));
  const subjectGuard = await readFile(new URL('../supabase/migrations/20261108215837_learning_os_validate_virtual_lab_course_subject.sql', import.meta.url), 'utf8');
  assert.ok(subjectGuard.includes('course_subjects cs'));
  assert.ok(subjectGuard.includes('academic_subjects subject'));
  assert.ok(subjectGuard.includes('Active paid course access for this subject is required'));
  assert.ok(action.includes("rpc('record_simulation_completion'"));
  assert.ok(component.includes('recordSimulationCompletion'));
  assert.ok(component.includes('hasInteracted'));
});

test('virtual labs appear in student workspace navigation', async () => {
  const source = await readFile(new URL('../components/portal-layout.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes("key: 'labs', label: 'Virtual labs', href: '/labs'"));
});


test('simulation completion cannot be forged through direct learning-event inserts', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108215857_learning_os_secure_simulation_completion_rpc.sql', import.meta.url), 'utf8');
  const policy = migration.slice(0, migration.indexOf('CREATE OR REPLACE FUNCTION public.record_simulation_completion'));
  assert.ok(policy.includes('duration_seconds IS NULL'));
  assert.ok(policy.includes("event_type IN ('lesson_viewed','lesson_completed','practice_started')"));
  assert.equal(policy.includes("'simulation_completed'"), false);
  assert.ok(migration.includes('public.record_simulation_completion'));
  assert.ok(migration.includes('Active paid course access for this subject is required'));
  assert.ok(migration.includes('duration_is_client_reported'));
});
