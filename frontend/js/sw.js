// Service Worker — Spoiler Esperado
// v3 — network-first para JS/CSS, sem bugs de clone

const CACHE_NAME = 'spoiler-esperado-v3';

const PRECACHE = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        PRECACHE.map(url => cache.add(url).catch(() => {}))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora APIs e métodos não-GET
  if (url.pathname.startsWith('/api/')) return;
  if (request.method !== 'GET') return;

  // 🔴 JS, CSS e sw.js: SEMPRE da rede. Nunca cacheia.
  if (url.pathname.startsWith('/js/') ||
      url.pathname.startsWith('/css/') ||
      url.pathname.endsWith('/sw.js')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // HTML — network-first, fallback pro cache se offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          // clone ANTES de qualquer leitura
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then(c => c || caches.match('/index.html'))
        )
    );
    return;
  }

  // Outros (imagens, JSON) — cache-first com update em background
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        // Atualiza em background, mas retorna o cache já
        fetch(request)
          .then(res => {
            if (res && res.status === 200) {
              const copy = res.clone();   // clone IMEDIATAMENTE
              caches.open(CACHE_NAME).then(c => c.put(request, copy));
            }
          })
          .catch(() => {});
        return cached;
      }

      // Não tem cache: baixa e guarda
      return fetch(request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, copy));
        }
        return res;
      });
    })
  );
});