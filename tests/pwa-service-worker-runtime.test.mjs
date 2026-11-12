import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const workerSource = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

function createWorker({ fetchImpl = async () => ({ ok: true, type: 'basic', clone() { return this; } }) } = {}) {
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
        async put(key, value) { store.set(typeof key === 'string' ? key : key.url, value); },
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
  const cache = await worker.stores;
  cache.set('jmt-shell-v1', new Map([['/offline', { body: 'offline explanation' }]]));
  let response;
  await worker.dispatch('fetch', {
    request: request('/', { mode: 'navigate' }),
    respondWith(value) { response = value; },
  });

  assert.deepEqual(await response, { body: 'offline explanation' });
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
