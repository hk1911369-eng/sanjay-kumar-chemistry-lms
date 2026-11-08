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
