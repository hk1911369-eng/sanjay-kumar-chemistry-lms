/* JMT Academy offline shell.
 * Intentionally caches only the offline fallback and immutable Next static assets.
 * Authenticated HTML, API responses, tokens, payment data and private student submissions
 * are never placed in Cache Storage by this worker.
 */
const CACHE_PREFIX = 'jmt-shell-';
const CACHE_NAME = 'jmt-shell-v2';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // A new worker must never mutate the cache used by the currently active
    // worker. Start with a clean versioned cache so failed installs cannot
    // leave stale assets that a later retry might accidentally activate.
    await caches.delete(CACHE_NAME);
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(OFFLINE_URL, { cache: 'reload' });
    if (!response.ok || response.type !== 'basic') throw new Error('Unable to precache offline fallback');
    if (response.url) {
      const finalUrl = new URL(response.url);
      if (finalUrl.origin !== self.location.origin || finalUrl.pathname !== OFFLINE_URL) {
        throw new Error('Offline fallback resolved to an unexpected page');
      }
    }
    await cache.put(OFFLINE_URL, response.clone());

    // The offline route is a client-rendered library. Precache only the
    // immutable Next build assets referenced by its generic HTML shell so
    // its JavaScript can hydrate without a network connection.
    const html = await response.clone().text();
    const staticAssets = [...new Set(html.match(/\/_next\/static\/[^"'\s<>]+/g) || [])];
    for (const asset of staticAssets) {
      const assetResponse = await fetch(asset, { cache: 'reload' });
      if (!assetResponse.ok || assetResponse.type !== 'basic') {
        throw new Error('Unable to precache offline library assets');
      }
      if (assetResponse.url) {
        const finalAssetUrl = new URL(assetResponse.url);
        if (finalAssetUrl.origin !== self.location.origin ||
            !finalAssetUrl.pathname.startsWith('/_next/static/')) {
          throw new Error('Offline library asset resolved outside immutable Next assets');
        }
      }
      await cache.put(asset, assetResponse);
    }
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
        const finalUrl = response.url ? new URL(response.url) : null;
        const remainsStaticAsset = !finalUrl ||
          (finalUrl.origin === self.location.origin &&
            finalUrl.pathname.startsWith('/_next/static/'));
        // Never store a redirected login or HTML response under a build-asset
        // key. Cache Storage quota errors must not break the network response.
        if (remainsStaticAsset) {
          try {
            await cache.put(request, response.clone());
          } catch {
            // The browser can still use the network response for this request.
          }
        }
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
