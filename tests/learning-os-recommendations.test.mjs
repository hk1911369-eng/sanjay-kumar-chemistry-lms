import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('LXP recommendations require evidence and currently paid course access', async () => {
  const page = await readFile(new URL('../app/student/page.tsx', import.meta.url), 'utf8');
  const component = await readFile(new URL('../components/learning-os-dashboard.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes('Number(item.evidence_count) >= 3'));
  assert.ok(page.includes('Number(item.mastery_score) <= 0.65'));
  assert.ok(page.includes('item.paid_through >= periodEnd'));
  assert.ok(page.includes(".eq('is_published',true)"));
  assert.ok(page.includes("from('lesson_concepts')"));
  assert.ok(page.includes(' : mastery.learning_concepts;'), 'single-object PostgREST relations retain the concept title');
  assert.ok(component.includes(' : item.learning_concepts;'), 'single-object PostgREST relations render concept titles');
  assert.ok(component.includes(' : concept?.academic_subjects;'), 'single-object subject relations render subject names');
  assert.ok(component.includes('Recommended next steps'));
  assert.ok(component.includes('recommendations: Recommendation[]'));
  assert.ok(component.includes('Recommendations are based on evidence, not guesses.'));
  assert.ok(component.includes('/learn/'));
});
