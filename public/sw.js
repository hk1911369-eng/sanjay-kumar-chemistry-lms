/* JMT Academy offline shell.
 * Intentionally caches only the offline fallback and immutable Next static assets.
 * Authenticated HTML, API responses, tokens, payment data and private student submissions
 * are never placed in Cache Storage by this worker.
 */
const CACHE_PREFIX = 'jmt-shell-';
const CACHE_NAME = 'jmt-shell-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(OFFLINE_URL, { cache: 'reload' });
    if (!response.ok) throw new Error('Unable to precache offline fallback');
    await cache.put(OFFLINE_URL, response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Only immutable, build-hashed Next assets use cache-first behaviour.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
      }
      return response;
    })());
    return;
  }

  // Never cache navigations or authenticated HTML. If a navigation fails,
  // return the static offline explanation rather than stale account content.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(OFFLINE_URL)) || Response.error();
      }
    })());
  }
});
