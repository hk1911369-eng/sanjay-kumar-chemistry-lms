import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('repeated-reading analysis uses sample statistics and accepted-value error', async () => {
  const component = await readFile(new URL('../components/lab-analysis-calculator.tsx', import.meta.url), 'utf8');
  assert.match(component, /export function calculateRepeatedReadings/);
  assert.match(component, /const mean = values\.reduce\(\(sum, value\) => sum \+ value, 0\) \/ count/);
  assert.match(component, /variance = count > 1[\s\S]*\/ \(count - 1\)/);
  assert.match(component, /Math\.sqrt\(variance\) \/ Math\.sqrt\(count\)/);
  assert.match(component, /Math\.abs\(mean - theoreticalValue\) \/ Math\.abs\(theoreticalValue\)/);
  assert.match(component, /theoreticalValue !== 0/);
  assert.match(component, /values\.some\(\(value\) => !Number\.isFinite\(value\)\)/);
});

test('student notebook exposes accessible, bounded repeated-reading analysis on create and edit', async () => {
  const [student, component, styles] = await Promise.all([
    readFile(new URL('../app/student/lab-notebook/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/lab-analysis-calculator.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
  ]);
  assert.match(student, /import \{ LabAnalysisCalculator \}/);
  assert.equal((student.match(/<LabAnalysisCalculator \/>/g) ?? []).length, 3);
  assert.match(component, /readings\.length >= 20/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /Copy analysis summary/);
  assert.match(component, /navigator\.clipboard\?\.writeText/);
  assert.match(styles, /\.lab-analysis-readings/);
  assert.match(styles, /@media\(max-width:620px\)\{\.lab-analysis-readings/);
  assert.match(styles, /@media\(max-width:360px\)\{\.lab-analysis-readings/);
});
