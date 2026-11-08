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
});

test('virtual lab completion is recorded through a paid-enrollment-checked database RPC', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261108215559_learning_os_record_virtual_lab_completion.sql', import.meta.url), 'utf8');
  const action = await readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8');
  const component = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  assert.ok(migration.includes("'simulation_completed'"));
  assert.ok(migration.includes("public.current_role() IS DISTINCT FROM 'student'::public.app_role"));
  assert.ok(migration.includes('e.admission_fee_paid IS TRUE'));
  assert.ok(migration.includes('e.paid_through>=v_period_end'));
  assert.ok(action.includes("rpc('record_simulation_completion'"));
  assert.ok(component.includes('recordSimulationCompletion'));
  assert.ok(component.includes('hasInteracted'));
});

test('virtual labs appear in student workspace navigation', async () => {
  const source = await readFile(new URL('../components/portal-layout.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes("key: 'labs', label: 'Virtual labs', href: '/labs'"));
});
