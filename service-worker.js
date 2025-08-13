// Define the cache name and version. Increment the version to trigger an update.
const CACHE_NAME = 'kp-pos-cache-v5'; 

// List of essential files to cache during the install phase (the "app shell").
const urlsToCache = [
  './index.html',
  './manifest.json'
  // Other assets like scripts and styles from CDNs will be cached dynamically at runtime.
];

// 1. Install Event: Caches the app shell.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Cache only the essential files during installation.
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Force the new service worker to become active immediately.
  );
});

// 2. Fetch Event: Handles network requests.
self.addEventListener('fetch', event => {
  // Only handle GET requests. Other requests (POST, etc.) should pass through.
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategy: Network first, falling back to cache.
  // This ensures users get the latest content when online.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return fetch(event.request)
        .then(networkResponse => {
          // If the network request is successful, update the cache with the new response.
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          // Return the fresh response from the network to the browser.
          return networkResponse;
        })
        .catch(() => {
          // If the network request fails (i.e., the user is offline),
          // try to serve the response from the cache.
          return cache.match(event.request);
        });
    })
  );
});

// 3. Activate Event: Cleans up old caches.
self.addEventListener('activate', event => {
  // A whitelist of cache names to keep.
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If a cache's name is not in our whitelist, delete it.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of the page immediately.
  );
});
