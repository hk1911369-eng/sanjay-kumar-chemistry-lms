import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('PWA manifest declares the JMT installable learning workspace', async () => {
  const manifest = JSON.parse(await read('../public/manifest.webmanifest'));
  assert.equal(manifest.name, 'JMT Academy');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'bn');
  assert.ok(manifest.icons.some((icon) => icon.src === '/jmt-academy-icon.svg'));
});

test('root layout exposes the manifest and registers the progressive enhancement', async () => {
  const layout = await read('../app/layout.tsx');
  const registration = await read('../components/pwa-service-worker.tsx');
  assert.match(layout, /manifest:\s*'\/manifest\.webmanifest'/);
  assert.match(layout, /<PwaServiceWorker\s*\/>/);
  assert.match(registration, /navigator\.serviceWorker\.register\('\/sw\.js'/);
  assert.match(registration, /process\.env\.NODE_ENV !== 'production'/);
  assert.match(registration, /window\.isSecureContext/);
});

test('offline route exposes the encrypted account-scoped library without rendering untrusted HTML', async () => {
  const page = await read('../app/offline/page.tsx');
  assert.match(page, /Offline lessons/);
  assert.match(page, /auth\\.getSession\\(\\)/);
  assert.match(page, /listForUser\\(currentUserId\\)/);
  assert.match(page, /openPackage\\(/);
  assert.doesNotMatch(page, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(page, /service_role/i);
});

test('service worker caches only offline fallback and immutable Next static assets', async () => {
  const worker = await read('../public/sw.js');
  assert.match(worker, /const OFFLINE_URL = '\/offline'/);
  assert.match(worker, /const CACHE_NAME = 'jmt-shell-v2'/);
  assert.match(worker, /await caches\.delete\(CACHE_NAME\)/);
  assert.match(worker, /Start with a clean versioned cache/);
  assert.match(worker, /url\.pathname\.startsWith\('\/_next\/static\/'\)/);
  assert.match(worker, /request\.mode === 'navigate'/);
  assert.match(worker, /cache\.match\(OFFLINE_URL\)/);
  assert.doesNotMatch(worker, /caches\.open\([^)]*\)\.then\([^)]*request\.url/);
  assert.doesNotMatch(worker, /url\.pathname\.startsWith\('\/api\//);
  assert.match(worker, /Never cache navigations or authenticated HTML/);
  assert.match(worker, /tokens, payment data and private student submissions\s*\* are never placed in Cache Storage/);
});
