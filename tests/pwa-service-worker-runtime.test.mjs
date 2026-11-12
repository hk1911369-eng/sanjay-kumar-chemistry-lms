import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const workerSource = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

function createWorker({ fetchImpl = async () => ({ ok: true, type: 'basic', clone() { return this; } }), cachePutImpl } = {}) {
  const listeners = new Map();
  const stores = new Map();
  const deleted = [];
  const calls = { fetch: [], skipWaiting: 0, claim: 0 };
  const cacheApi = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async match(key) { return store.get(typeof key === 'string' ? key : key.url); },
        async put(key, value) {
          if (cachePutImpl) return cachePutImpl(store, key, value);
          store.set(typeof key === 'string' ? key : key.url, value);
        },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { deleted.push(name); return stores.delete(name); },
  };
  const self = {
    location: { origin: 'https://academy.example' },
    clients: { async claim() { calls.claim += 1; } },
    async skipWaiting() { calls.skipWaiting += 1; },
    addEventListener(type, callback) { listeners.set(type, callback); },
  };
  const context = {
    self,
    caches: cacheApi,
    URL,
    Response: { error: () => ({ error: true }) },
    fetch: async (...args) => {
      calls.fetch.push(args);
      return fetchImpl(...args);
    },
  };
  vm.runInNewContext(workerSource, context, { filename: 'public/sw.js' });
  return {
    stores, deleted, calls,
    async dispatch(type, event) { listeners.get(type)(event); },
  };
}

function lifecycleEvent() {
  let pending;
  return {
    event: { waitUntil(value) { pending = value; } },
    async finish() { await pending; },
  };
}

function request(url, { method = 'GET', mode = 'no-cors' } = {}) {
  return { url: new URL(url, 'https://academy.example').href, method, mode };
}

test('install precaches only the offline explanation and activates after success', async () => {
  const worker = createWorker();
  const lifecycle = lifecycleEvent();
  await worker.dispatch('install', lifecycle.event);
  await lifecycle.finish();

  assert.ok(worker.stores.get('jmt-shell-v1').has('/offline'));
  assert.equal(worker.calls.skipWaiting, 1);
  assert.deepEqual(worker.calls.fetch[0][0], '/offline');
});

test('failed offline fallback fetch rejects installation instead of activating a broken shell', async () => {
  const worker = createWorker({ fetchImpl: async () => ({ ok: false, type: 'basic' }) });
  const lifecycle = lifecycleEvent();
  await worker.dispatch('install', lifecycle.event);
  await assert.rejects(lifecycle.finish(), /Unable to precache offline fallback/);
  assert.equal(worker.calls.skipWaiting, 0);
});

test('install does not activate when Cache Storage cannot persist the offline fallback', async () => {
  const worker = createWorker({
    cachePutImpl: async () => { throw new Error('quota exceeded'); },
  });
  const lifecycle = lifecycleEvent();
  await worker.dispatch('install', lifecycle.event);
  await assert.rejects(lifecycle.finish(), /quota exceeded/);
  assert.equal(worker.calls.skipWaiting, 0);
});

test('activation removes only obsolete JMT shell caches', async () => {
  const worker = createWorker();
  worker.stores.set('jmt-shell-v0', new Map());
  worker.stores.set('another-app-cache', new Map());
  const lifecycle = lifecycleEvent();
  await worker.dispatch('activate', lifecycle.event);
  await lifecycle.finish();

  assert.deepEqual(worker.deleted, ['jmt-shell-v0']);
  assert.equal(worker.calls.claim, 1);
  assert.ok(worker.stores.has('another-app-cache'));
});

test('offline navigation returns the cached explanation after a network failure', async () => {
  const worker = createWorker({ fetchImpl: async () => { throw new Error('offline'); } });
  worker.stores.set('jmt-shell-v1', new Map([['/offline', { body: 'offline explanation' }]]));
  let response;
  await worker.dispatch('fetch', {
    request: request('/', { mode: 'navigate' }),
    respondWith(value) { response = value; },
  });

  assert.deepEqual(await response, { body: 'offline explanation' });
});

test('HTTP server errors remain visible instead of being disguised as offline mode', async () => {
  const serverError = { ok: false, status: 503, marker: 'server-unavailable' };
  const worker = createWorker({ fetchImpl: async () => serverError });
  let response;
  await worker.dispatch('fetch', {
    request: request('/student/dashboard', { mode: 'navigate' }),
    respondWith(value) { response = value; },
  });

  assert.equal(await response, serverError);
  assert.equal(worker.stores.size, 0);
});

test('online navigation remains network-only and does not cache authenticated HTML', async () => {
  const htmlResponse = { ok: true, type: 'basic', marker: 'fresh-account-html' };
  const worker = createWorker({ fetchImpl: async () => htmlResponse });
  let response;
  await worker.dispatch('fetch', {
    request: request('/student/dashboard', { mode: 'navigate' }),
    respondWith(value) { response = value; },
  });

  assert.equal(await response, htmlResponse);
  assert.equal(worker.calls.fetch.length, 1);
  assert.equal(worker.stores.size, 0);
});

test('POST requests and API reads are never intercepted or cached', async () => {
  const worker = createWorker();
  let postIntercepted = false;
  let apiIntercepted = false;

  await worker.dispatch('fetch', {
    request: request('/api/assessment/submit', { method: 'POST' }),
    respondWith() { postIntercepted = true; },
  });
  await worker.dispatch('fetch', {
    request: request('/api/student/profile'),
    respondWith() { apiIntercepted = true; },
  });

  assert.equal(postIntercepted, false);
  assert.equal(apiIntercepted, false);
  assert.equal(worker.calls.fetch.length, 0);
  assert.equal(worker.stores.size, 0);
});

test('ordinary same-origin GET resources are not intercepted or cached', async () => {
  const worker = createWorker();
  let intercepted = false;
  await worker.dispatch('fetch', {
    request: request('/storage/v1/object/private/student-work.pdf'),
    respondWith() { intercepted = true; },
  });

  assert.equal(intercepted, false);
  assert.equal(worker.calls.fetch.length, 0);
  assert.equal(worker.stores.size, 0);
});

test('cross-origin requests are left to the browser and are not cached', async () => {
  const worker = createWorker();
  let intercepted = false;
  await worker.dispatch('fetch', {
    request: { ...request('/library.js'), url: 'https://media.example/library.js' },
    respondWith() { intercepted = true; },
  });

  assert.equal(intercepted, false);
  assert.equal(worker.calls.fetch.length, 0);
  assert.equal(worker.stores.size, 0);
});

test('same-origin Next static assets use cache-first and cache successful network responses', async () => {
  const assetResponse = { ok: true, type: 'basic', clone() { return this; }, marker: 'network-asset' };
  const worker = createWorker({ fetchImpl: async () => assetResponse });
  let response;
  await worker.dispatch('fetch', {
    request: request('/_next/static/chunks/app.js'),
    respondWith(value) { response = value; },
  });

  assert.equal(await response, assetResponse);
  assert.equal(worker.calls.fetch.length, 1);
  assert.ok(worker.stores.get('jmt-shell-v1').has('https://academy.example/_next/static/chunks/app.js'));
});

test('static asset remains available when Cache Storage rejects a write', async () => {
  const assetResponse = { ok: true, type: 'basic', clone() { return this; }, marker: 'network-asset' };
  const worker = createWorker({
    fetchImpl: async () => assetResponse,
    cachePutImpl: async () => { throw new Error('quota exceeded'); },
  });
  let response;
  await worker.dispatch('fetch', {
    request: request('/_next/static/chunks/app.js'),
    respondWith(value) { response = value; },
  });

  assert.equal(await response, assetResponse);
  assert.equal(worker.calls.fetch.length, 1);
  assert.equal(worker.stores.get('jmt-shell-v1').size, 0);
});

test('unsuccessful Next static asset responses are not cached', async () => {
  const missingAsset = { ok: false, type: 'basic', status: 404, clone() { return this; } };
  const worker = createWorker({ fetchImpl: async () => missingAsset });
  let response;
  await worker.dispatch('fetch', {
    request: request('/_next/static/chunks/missing.js'),
    respondWith(value) { response = value; },
  });

  assert.equal(await response, missingAsset);
  assert.equal(worker.calls.fetch.length, 1);
  assert.equal(worker.stores.get('jmt-shell-v1').size, 0);
});

test('cached Next static assets are served without a network request', async () => {
  const worker = createWorker({ fetchImpl: async () => { throw new Error('network should not be used'); } });
  const cachedAsset = { marker: 'cached-build-asset' };
  worker.stores.set('jmt-shell-v1', new Map([
    ['https://academy.example/_next/static/chunks/app.js', cachedAsset],
  ]));
  let response;
  await worker.dispatch('fetch', {
    request: request('/_next/static/chunks/app.js'),
    respondWith(value) { response = value; },
  });

  assert.equal(await response, cachedAsset);
  assert.equal(worker.calls.fetch.length, 0);
});
