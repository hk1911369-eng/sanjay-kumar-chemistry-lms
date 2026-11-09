import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const {
  isAllowedLabEvidenceSignature,
  labEvidenceExtensionForMime,
} = require('../lib/lab-evidence-signature.js');

test('practical evidence accepts only matching supported file signatures', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
  const pdf = new TextEncoder().encode('%PDF-1.7');

  assert.equal(isAllowedLabEvidenceSignature('image/jpeg', jpeg), true);
  assert.equal(isAllowedLabEvidenceSignature('image/png', png), true);
  assert.equal(isAllowedLabEvidenceSignature('image/webp', webp), true);
  assert.equal(isAllowedLabEvidenceSignature('application/pdf', pdf), true);
  assert.equal(isAllowedLabEvidenceSignature('application/pdf', jpeg), false);
  assert.equal(isAllowedLabEvidenceSignature('image/png', pdf), false);
  assert.equal(isAllowedLabEvidenceSignature('text/html', new TextEncoder().encode('<html>')), false);
  assert.equal(isAllowedLabEvidenceSignature('application/pdf', new Uint8Array([0x25, 0x50])), false);
});

test('evidence MIME types map to fixed server-generated filename extensions', () => {
  assert.equal(labEvidenceExtensionForMime('image/jpeg'), 'jpg');
  assert.equal(labEvidenceExtensionForMime('image/png'), 'png');
  assert.equal(labEvidenceExtensionForMime('image/webp'), 'webp');
  assert.equal(labEvidenceExtensionForMime('application/pdf'), 'pdf');
  assert.equal(labEvidenceExtensionForMime('image/svg+xml'), null);
  assert.equal(labEvidenceExtensionForMime('application/zip'), null);
});

test('evidence bucket is private, bounded and role-scoped', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110233000_add_private_lab_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.match(migration, /'lab-notebook-evidence'[\s\S]*false[\s\S]*8388608/i);
  assert.match(migration, /array\['image\/jpeg','image\/png','image\/webp','application\/pdf'\]/i);
  assert.match(migration, /alter table public\.lab_notebook_evidence enable row level security/i);
  assert.match(migration, /current_role\(\).*'student'/is);
  assert.match(migration, /ca\.teacher_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /return v_count < 8/i);
  assert.match(migration, /not exists \([\s\S]*from public\.lab_notebook_evidence ev[\s\S]*ev\.storage_path = storage\.objects\.name/i);
  assert.match(migration, /o\.owner = auth\.uid\(\) or o\.owner_id = auth\.uid\(\)::text/i);
});

test('evidence upload action verifies the notebook, file size and binary signature before upload', async () => {
  const action = await readFile(new URL('../app/actions/lab-notebook-evidence.ts', import.meta.url), 'utf8');
  assert.match(action, /8 \* 1024 \* 1024/);
  assert.match(action, /MAX_EVIDENCE_PER_NOTEBOOK = 8/);
  assert.match(action, /isAllowedLabEvidenceSignature\(file\.type, bytes\)/);
  assert.match(action, /status'\)\.eq\('student_id', user\.id\)/);
  assert.match(action, /upsert: false/);
  assert.match(action, /storage\.from\('lab-notebook-evidence'\)\.remove\(\[storagePath\]\)/);
});

test('evidence downloads are minted only after the metadata row passes RLS', async () => {
  const route = await readFile(new URL('../app/api/lab-notebook-evidence/[id]/route.ts', import.meta.url), 'utf8');
  assert.match(route, /auth\.getUser/);
  assert.match(route, /from\('lab_notebook_evidence'\)/);
  assert.match(route, /createSignedUrl\(evidence\.storage_path, 60, \{ download: true \}\)/);
  assert.match(route, /Cache-Control', 'private, no-store/);
  assert.match(route, /Referrer-Policy', 'no-referrer/);
});

test('student and teacher workspaces expose evidence only through the guarded download route', async () => {
  const [student, teacher, config] = await Promise.all([
    readFile(new URL('../app/student/lab-notebook/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/teacher/lab-notebooks/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../next.config.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(student, /uploadLabNotebookEvidence/);
  assert.match(student, /\/api\/lab-notebook-evidence\//);
  assert.match(student, /Evidence files/);
  assert.match(teacher, /\/api\/lab-notebook-evidence\//);
  assert.match(teacher, /Supporting evidence/);
  assert.match(config, /bodySizeLimit: '10mb'/);
});
