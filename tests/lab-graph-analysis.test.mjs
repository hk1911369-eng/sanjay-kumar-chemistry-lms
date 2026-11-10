import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('linear regression calculation guards invalid and non-identifiable datasets', async () => {
  const component = await readFile(new URL('../components/lab-graph-analysis.tsx', import.meta.url), 'utf8');
  assert.match(component, /export function calculateLinearRegression/);
  assert.match(component, /points\.length < 2/);
  assert.match(component, /points\.some\(point => !Number\.isFinite\(point\.x\) \|\| !Number\.isFinite\(point\.y\)\)/);
  assert.match(component, /if \(sxx === 0\) return null/);
  assert.match(component, /const slope = sxy \/ sxx/);
  assert.match(component, /const intercept = meanY - slope \* meanX/);
  assert.match(component, /rSquared/);
  assert.match(component, /correlation/);
});

test('graph analysis is integrated into all student notebook states and remains mobile responsive', async () => {
  const [student, component, styles] = await Promise.all([
    readFile(new URL('../app/student/lab-notebook/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/lab-graph-analysis.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
  ]);
  assert.match(student, /import \{ LabGraphAnalysis \}/);
  assert.equal((student.match(/<LabGraphAnalysis \/>/g) ?? []).length, 3);
  assert.match(component, /points\.length>=20/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /role="img"/);
  assert.match(component, /Copy graph analysis/);
  assert.match(component, /Insert into observations/);
  assert.match(component, /textarea\\[name="observations"\\]/);
  assert.match(component, /field\\.dispatchEvent\\(new Event\\('input'/);\n  assert.match(component, /Insert into observations/);\n  assert.match(component, /textarea\\[name="observations"\\]/);\n  assert.match(component, /field\\.dispatchEvent\\(new Event\\('input'/);
  assert.match(styles, /\.lab-graph-chart/);
  assert.match(styles, /@media\(max-width:620px\)\{\.lab-graph-labels/);
  assert.match(styles, /@media\(max-width:360px\)\{\.lab-graph-point/);
});
