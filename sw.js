/* Service worker mínimo: solo hace la app instalable y sirve el shell si no hay red.
   Los datos SIEMPRE van a la red (nunca se cachean respuestas de Supabase). */
const CACHE = 'ev-comite-v2';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/app.js', 'manifest.webmanifest', 'icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // Supabase y esm.sh: directo a la red
  e.respondWith(
    fetch(e.request)
      .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
