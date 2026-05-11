const CACHE_NAME = 'marble-racer-cache-v1';
const CORE_ASSETS = [
  '/marble-racer/',
  '/marble-racer/index.html',
  '/marble-racer/manifest.json'
];

// 1. Install: Pre-cache the absolute essentials
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Activate: Clean up old caches if you ever bump the CACHE_NAME version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch: Dynamic caching for Vite's hashed JS/CSS files
self.addEventListener('fetch', (event) => {
  // Only intercept standard GET requests (ignore API calls, Chrome extensions, etc.)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Fetch the newest version from the network in the background
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // If the fetch was successful, quietly update the cache with the new file
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If offline and the network fails, just fail silently. 
        // The user will still get the cachedResponse below if it exists.
        console.log("Offline mode: Serving from cache.");
      });

      // Instantly return the cached file if we have it, otherwise wait for the network fetch
      return cachedResponse || fetchPromise;
    })
  );
});