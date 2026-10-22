// Service worker: lets the installed app open and show your last-loaded
// data with no signal (a kitchen corner, a cabin). Changes still need a
// connection.
//
// Strategy:
//   app files and API reads  network first, fall back to the cached copy
//   photos                   cache first (a photo id never changes)
//   anything else            straight to the network
//
// Bump VERSION when the list below changes.
const VERSION = 'bread-v1';

const SHELL = [
  '/', '/index.html', '/manifest.webmanifest', '/css/app.css',
  '/js/app.js', '/js/api.js', '/js/calc.js', '/js/photos.js', '/js/timeline.js', '/js/ui.js',
  '/js/views/bake-form.js', '/js/views/bakes.js', '/js/views/calculator.js', '/js/views/compare.js',
  '/js/views/login.js', '/js/views/peak-chart.js', '/js/views/recipes.js', '/js/views/settings.js',
  '/js/views/starter.js', '/js/views/timer.js',
  '/img/icon-192.png', '/img/bread.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
    if (cached) return cached;
    if (request.mode === 'navigate') return cache.match('/index.html');
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/photos/')) return event.respondWith(cacheFirst(request));
  // Session checks and downloads must always be live.
  if (url.pathname === '/api/session' || url.pathname.startsWith('/api/export')) return;
  event.respondWith(networkFirst(request));
});
