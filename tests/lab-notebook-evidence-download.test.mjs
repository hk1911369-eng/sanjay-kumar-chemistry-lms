import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('evidence downloads require authentication and a row visible through notebook evidence RLS', async () => {
  const route = await readFile(new URL('../app/api/lab-notebook-evidence/[evidenceId]/route.ts', import.meta.url), 'utf8');
  assert.match(route, /db\.auth\.getUser/);
  assert.match(route, /from\('lab_notebook_evidence'\)/);
  assert.match(route, /createSignedUrl/);
  assert.match(route, /createSignedUrl\(evidence\.storage_path, 60/);
  assert.match(route, /Cache-Control/);
  assert.match(route, /Referrer-Policy/);
  assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(route, /request\.url.*storage_path/);
});

test('evidence download rejects malformed identifiers and never accepts a caller-supplied path', async () => {
  const route = await readFile(new URL('../app/api/lab-notebook-evidence/[evidenceId]/route.ts', import.meta.url), 'utf8');
  assert.match(route, /if \(!uuid\.test\(evidenceId\)\)/);
  assert.match(route, /status: 404/);
  assert.match(route, /storage_path,original_filename,content_type/);
  assert.match(route, /download: evidence\.original_filename/);
});

test('student and teacher evidence links resolve to the authenticated download route', async () => {
  const [student, teacher] = await Promise.all([
    readFile(new URL('../app/student/lab-notebook/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/teacher/lab-notebooks/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(student, /\/api\/lab-notebook-evidence\/'\+file\.id/);
  assert.match(teacher, /\/api\/lab-notebook-evidence\/'\+file\.id/);
});
