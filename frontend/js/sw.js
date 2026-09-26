// Service Worker — Spoiler Esperado
const CACHE_NAME = 'spoiler-esperado-v1';

// Arquivos essenciais para o app abrir offline
const PRECACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/cadastro.html',
  '/completar.html',
  '/perfil.html',
  '/perfil',
  '/editar-perfil.html',
  '/shelf.html',
  '/css/perfil.css',
  '/js/offline.js',
  '/js/perfil.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        PRECACHE.map(url =>
          cache.add(url).catch(err => console.warn('Falha ao cachear', url, err))
        )
      )
    ).then(() => self.skipWaiting())
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

  // Não intercepta chamadas de API — deixa o fetch normal tratar
  if (url.pathname.startsWith('/api/')) return;

  // Só GET
  if (request.method !== 'GET') return;

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
            cached || caches.match('/perfil.html') || caches.match('/index.html')
          )
        )
    );
    return;
  }

  // Estáticos → cache-first com atualização em background
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