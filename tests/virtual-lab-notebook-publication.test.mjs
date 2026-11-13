import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('student practical creation and editing require a published, active paid course', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113140000_require_published_course_for_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.match(migration, /create policy "paid students create own lab notebooks"[\s\S]*c\.is_published is true/i);
  assert.match(migration, /create policy "notebook entries scoped update"[\s\S]*with check[\s\S]*c\.is_published is true/i);
  assert.match(migration, /e\.status = 'active'/i);
  assert.match(migration, /e\.admission_fee_paid is true/i);
  assert.match(migration, /e\.paid_through >=/i);
  assert.match(migration, /c\.archived_at is null/i);
});

test('student practical assignment visibility requires published course and experiment', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113140000_require_published_course_for_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.match(migration, /create policy "practical assignments scoped read"[\s\S]*status = 'published'[\s\S]*vl\.is_published is true[\s\S]*c\.is_published is true/i);
});

test('notebook evidence metadata and Storage uploads independently enforce current publication and paid access', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113140000_require_published_course_for_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.match(migration, /create policy "students attach evidence to editable own notebook"[\s\S]*c\.is_published is true/i);
  assert.match(migration, /create or replace function private\.can_upload_lab_notebook_evidence/i);
  assert.match(migration, /join public\.courses c on c\.id = e\.course_id[\s\S]*c\.is_published is true/i);
  assert.match(migration, /join public\.virtual_lab_catalog vl[\s\S]*vl\.is_published is true/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /return v_count < 8/i);
  assert.match(migration, /revoke all on function private\.can_upload_lab_notebook_evidence\(text\) from public, anon/i);
  assert.match(migration, /grant execute on function private\.can_upload_lab_notebook_evidence\(text\) to authenticated/i);
});

test('existing notebook reads and private evidence reads are not replaced by the write hardening migration', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113140000_require_published_course_for_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(migration, /drop policy if exists "notebook entries scoped read"/i);
  assert.doesNotMatch(migration, /drop policy if exists "notebook evidence scoped read"/i);
  assert.doesNotMatch(migration, /drop policy if exists "notebook owners and assigned teachers read evidence objects"/i);
  assert.match(migration, /Existing object reads and deletion of unreferenced uploads are intentionally unchanged/i);
});

test('evidence metadata filename policy uses one literal-dot escape under standard PostgreSQL strings', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113140000_require_published_course_for_notebook_evidence.sql', import.meta.url), 'utf8');
  const expected = String.raw`\.(jpg|png|webp|pdf)import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('student practical creation and editing require a published, active paid course', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113140000_require_published_course_for_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.match(migration, /create policy "paid students create own lab notebooks"[\s\S]*c\.is_published is true/i);
  assert.match(migration, /create policy "notebook entries scoped update"[\s\S]*with check[\s\S]*c\.is_published is true/i);
  assert.match(migration, /e\.status = 'active'/i);
  assert.match(migration, /e\.admission_fee_paid is true/i);
  assert.match(migration, /e\.paid_through >=/i);
  assert.match(migration, /c\.archived_at is null/i);
});

test('student practical assignment visibility requires published course and experiment', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113140000_require_published_course_for_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.match(migration, /create policy "practical assignments scoped read"[\s\S]*status = 'published'[\s\S]*vl\.is_published is true[\s\S]*c\.is_published is true/i);
});

test('notebook evidence metadata and Storage uploads independently enforce current publication and paid access', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113140000_require_published_course_for_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.match(migration, /create policy "students attach evidence to editable own notebook"[\s\S]*c\.is_published is true/i);
  assert.match(migration, /create or replace function private\.can_upload_lab_notebook_evidence/i);
  assert.match(migration, /join public\.courses c on c\.id = e\.course_id[\s\S]*c\.is_published is true/i);
  assert.match(migration, /join public\.virtual_lab_catalog vl[\s\S]*vl\.is_published is true/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /return v_count < 8/i);
  assert.match(migration, /revoke all on function private\.can_upload_lab_notebook_evidence\(text\) from public, anon/i);
  assert.match(migration, /grant execute on function private\.can_upload_lab_notebook_evidence\(text\) to authenticated/i);
});

test('existing notebook reads and private evidence reads are not replaced by the write hardening migration', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113140000_require_published_course_for_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(migration, /drop policy if exists "notebook entries scoped read"/i);
  assert.doesNotMatch(migration, /drop policy if exists "notebook evidence scoped read"/i);
  assert.doesNotMatch(migration, /drop policy if exists "notebook owners and assigned teachers read evidence objects"/i);
  assert.match(migration, /Existing object reads and deletion of unreferenced uploads are intentionally unchanged/i);
});

;
  const incorrect = String.raw`\\.(jpg|png|webp|pdf)import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('student practical creation and editing require a published, active paid course', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113140000_require_published_course_for_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.match(migration, /create policy "paid students create own lab notebooks"[\s\S]*c\.is_published is true/i);
  assert.match(migration, /create policy "notebook entries scoped update"[\s\S]*with check[\s\S]*c\.is_published is true/i);
  assert.match(migration, /e\.status = 'active'/i);
  assert.match(migration, /e\.admission_fee_paid is true/i);
  assert.match(migration, /e\.paid_through >=/i);
  assert.match(migration, /c\.archived_at is null/i);
});

test('student practical assignment visibility requires published course and experiment', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113140000_require_published_course_for_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.match(migration, /create policy "practical assignments scoped read"[\s\S]*status = 'published'[\s\S]*vl\.is_published is true[\s\S]*c\.is_published is true/i);
});

test('notebook evidence metadata and Storage uploads independently enforce current publication and paid access', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113140000_require_published_course_for_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.match(migration, /create policy "students attach evidence to editable own notebook"[\s\S]*c\.is_published is true/i);
  assert.match(migration, /create or replace function private\.can_upload_lab_notebook_evidence/i);
  assert.match(migration, /join public\.courses c on c\.id = e\.course_id[\s\S]*c\.is_published is true/i);
  assert.match(migration, /join public\.virtual_lab_catalog vl[\s\S]*vl\.is_published is true/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /return v_count < 8/i);
  assert.match(migration, /revoke all on function private\.can_upload_lab_notebook_evidence\(text\) from public, anon/i);
  assert.match(migration, /grant execute on function private\.can_upload_lab_notebook_evidence\(text\) to authenticated/i);
});

test('existing notebook reads and private evidence reads are not replaced by the write hardening migration', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113140000_require_published_course_for_notebook_evidence.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(migration, /drop policy if exists "notebook entries scoped read"/i);
  assert.doesNotMatch(migration, /drop policy if exists "notebook evidence scoped read"/i);
  assert.doesNotMatch(migration, /drop policy if exists "notebook owners and assigned teachers read evidence objects"/i);
  assert.match(migration, /Existing object reads and deletion of unreferenced uploads are intentionally unchanged/i);
});

;
  assert.ok(migration.includes(expected));
  assert.equal(migration.includes(incorrect), false);
});
