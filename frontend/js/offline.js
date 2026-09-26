// Suporte offline com IndexedDB: cache de usuários + fila de requisições pendentes
(function () {
  const DB_NAME = 'spoilerEsperadoDB';
  const DB_VERSION = 1;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('usuarios'))
          db.createObjectStore('usuarios', { keyPath: 'email' });
        if (!db.objectStoreNames.contains('pending'))
          db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  const tx = (db, store, mode) => db.transaction(store, mode).objectStore(store);

  async function salvarUsuario(user) {
    if (!user || !user.email) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = tx(db, 'usuarios', 'readwrite').put(user);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  async function obterUsuario(email) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = tx(db, 'usuarios', 'readonly').get(email);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async function enfileirarRequisicao(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = tx(db, 'pending', 'readwrite').add({ ...item, timestamp: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  async function obterPendentes() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = tx(db, 'pending', 'readonly').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async function removerPendente(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = tx(db, 'pending', 'readwrite').delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  async function sincronizar() {
    if (!navigator.onLine) return;
    try {
      const pendentes = await obterPendentes();
      for (const item of pendentes) {
        try {
          const res = await fetch(item.url, { ...item.options, credentials: 'include' });
          if (res.ok) await removerPendente(item.id);
        } catch (err) {
          console.warn('Falha ao sincronizar item', item.url, err);
        }
      }
    } catch (err) { console.error(err); }
  }

  // ---------- Registro do Service Worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('Falha ao registrar Service Worker:', err);
      });
    });
  }

  window.addEventListener('online', sincronizar);
  document.addEventListener('DOMContentLoaded', sincronizar);

  window.OfflineDB = {
    openDB, salvarUsuario, obterUsuario,
    enfileirarRequisicao, obterPendentes, removerPendente, sincronizar
  };
})();