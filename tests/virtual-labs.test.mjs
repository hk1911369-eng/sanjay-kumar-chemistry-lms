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

test('virtual labs appear in student workspace navigation', async () => {
  const source = await readFile(new URL('../components/portal-layout.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes("key: 'labs', label: 'Virtual labs', href: '/labs'"));
});


test('virtual lab completion is recorded only for the student\'s current paid course', async () => {
  const action = await readFile(new URL('../app/actions/virtual-labs.ts', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/labs/page.tsx', import.meta.url), 'utf8');
  const studio = await readFile(new URL('../components/virtual-lab-studio.tsx', import.meta.url), 'utf8');
  assert.ok(action.includes("profile?.role !== 'student'"));
  assert.ok(action.includes(".eq('student_id', user.id)"));
  assert.ok(action.includes(".eq('status', 'active')"));
  assert.ok(action.includes(".eq('admission_fee_paid', true)"));
  assert.ok(action.includes(".gte('paid_through', periodEnd)"));
  assert.ok(action.includes("event_type: 'simulation_completed'"));
  assert.ok(action.includes('labSubjects[labId]'));
  assert.ok(page.includes('<VirtualLabStudio courses={courses ?? []} />'));
  assert.ok(studio.includes('recordVirtualLabCompletion'));
  assert.ok(studio.includes('Mark simulation complete'));
});
