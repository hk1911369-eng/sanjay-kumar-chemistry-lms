import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routePath = new URL('../app/api/offline/lesson-package/route.ts', import.meta.url);
const migrationPath = new URL('../supabase/migrations/20261113120000_lesson_offline_permission.sql', import.meta.url);
const actionPath = new URL('../app/actions/learning.ts', import.meta.url);
const editorPath = new URL('../app/teacher/page.tsx', import.meta.url);

test('offline package endpoint authenticates and checks current paid enrollment', async () => {
  const source = await readFile(routePath, 'utf8');
  for (const required of [
    'supabase.auth.getUser()',
    ".from('profiles')",
    ".select('role,is_active')",
    ".from('lessons')",
    'lesson.offline_allowed !== true',
    ".select('id,title,course_id,is_published,offline_allowed,content,updated_at')",
    'accountId: user.id',
    'lessonTitle: lesson.title',
    ".from('courses')",
    ".from('enrollments')",
    'resolveOfflineEntitlement',
    "'Cache-Control': 'private, no-store, max-age=0'",
  ]) assert.ok(source.includes(required), `Missing route guard: ${required}`);
  assert.match(source, /runtime = 'nodejs'/);
});

test('offline permission defaults closed and only active admins may change it', async () => {
  const source = await readFile(migrationPath, 'utf8');
  assert.match(source, /offline_allowed boolean not null default false/i);
  assert.match(source, /new\.offline_allowed is distinct from old\.offline_allowed/i);
  assert.match(source, /public\.current_role\(\).*'admin'/s);
  assert.match(source, /before insert or update on public\.lessons/i);
  assert.match(source, /tg_op = 'INSERT' and new\.offline_allowed is true/i);
  assert.match(source, /revoke all on function public\.enforce_lesson_offline_permission_admin\(\) from public, anon, authenticated/i);
});

test('lesson editor exposes offline approval only to admins and server action ignores staff input', async () => {
  const action = await readFile(actionPath, 'utf8');
  const editor = await readFile(editorPath, 'utf8');
  assert.match(action, /profile\.role === 'admin'[\s\S]*offline_allowed/);
  assert.match(action, /profile\.role === 'admin'[\s\S]*formData\.get\('offline_allowed'\)/);
  assert.match(editor, /profile\.role==='admin'&&<label[^>]*>[\s\S]*name="offline_allowed"/);
  assert.match(editor, /is_published,offline_allowed/);
});

test('offline library is account-scoped and opens only verified vault content', async () => {
  const library = await readFile(new URL('../app/offline/page.tsx', import.meta.url), 'utf8');
  const downloadButton = await readFile(new URL('../components/offline-lesson-download-button.tsx', import.meta.url), 'utf8');
  const vault = await readFile(new URL('../lib/offline/encrypted-vault.mjs', import.meta.url), 'utf8');
  assert.match(library, /auth\.getSession\(\)/);
  assert.match(library, /onAuthStateChange/);
  assert.match(library, /nextUserId !== loadedUserId/);
  assert.ok(library.includes('confirmedSession?.user?.id === currentUserId'));
  assert.ok(library.includes('confirmedSession?.user?.id !== userId'));
  assert.ok(library.includes('session?.user?.id !== userId'));
  assert.match(library, /listForUser\\(currentUserId\\)/);
  assert.doesNotMatch(library, /userId\\.slice\\(0,\\s*8\\)/, 'do not expose account identifier fragments in the UI');
  const removeFlow = library.slice(library.indexOf('async function removeLesson'), library.indexOf('return ('));
  assert.match(removeFlow, /await createVault\\(\\)\\.remove\\([\\s\\S]*?getSession\\(\\)[\\s\\S]*?confirmedSession\\?\\.user\\?\\.id !== userId/);
  assert.match(library, /openPackage\(/);
  assert.match(library, /new TextDecoder\('utf-8', \{ fatal: true \}\)/);
  assert.doesNotMatch(library, /dangerouslySetInnerHTML/);
  assert.match(downloadButton, /session\.user\.id !== userId/);
  assert.match(vault, /listPackages\(userId\)/);
  assert.match(vault, /OFFLINE_VAULT_DB_VERSION = 2/);
});
