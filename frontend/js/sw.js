// Service Worker — Spoiler Esperado
// v2 — não cacheia JS/CSS próprios (evita servir versão antiga após deploy)

const CACHE_NAME = 'spoiler-esperado-v2';   // 👈 incrementado de v1 → v2

// Só pré-cacheia o essencial (HTML estático)
const PRECACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/cadastro.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        PRECACHE.map(url =>
          cache.add(url).catch(err => console.warn('Falha ao cachear', url, err))
        )
      )
    ).then(() => self.skipWaiting())   // 👈 ativa imediatamente
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Não intercepta chamadas de API
  if (url.pathname.startsWith('/api/')) return;

  // Só GET
  if (request.method !== 'GET') return;

  // 🔴 NUNCA cachear JS e CSS próprios — sempre da rede
  if (url.pathname.startsWith('/js/') || url.pathname.startsWith('/css/') || url.pathname.endsWith('/sw.js')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Navegação (HTML) → network-first com fallback para cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || caches.match('/index.html')
          )
        )
    );
    return;
  }

  // Outros estáticos (imagens, JSON) → cache-first com atualização em background
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});