
const CACHE_NAME = 'sinonimoak-v1';
const ASSETS = [
  './',
  './index.html',
  './index.tsx',
  './App.tsx',
  './data.ts',
  './types.ts',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
