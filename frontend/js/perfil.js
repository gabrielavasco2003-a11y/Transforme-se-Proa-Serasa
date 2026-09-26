// ============================================================
// Renderiza dados no DOM
// ============================================================
function renderPerfil(user) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set('nomePerfil',       user.nome    || 'Usuário');
  set('nomeCompletoPerfil', user.nome  || '—');
  set('emailPerfil',      user.email   || '—');
  set('usuarioPerfil',    user.usuario || '—');
  set('nascimentoPerfil', user.nascimento
    ? new Date(user.nascimento).toLocaleDateString('pt-BR')
    : '—');
}

// ============================================================
// Prévia da Shelf
// ============================================================
function renderPreviaShelf(itens = []) {
  const lista = document.getElementById('previaLista');
  if (!lista) return;

  if (!itens.length) {
    lista.innerHTML = '<p class="vazio">Nenhum livro na sua shelf ainda.</p>';
    return;
  }

  lista.innerHTML = itens.slice(0, 4).map(item => `
    <div class="previa-item">
      <img src="${item.thumbnail || '../../img/placeholder.png'}"
           alt="${(item.title || '').replace(/"/g, '&quot;')}"
           onerror="this.src='../../img/placeholder.png'">
      <span>${item.title || 'Sem título'}</span>
    </div>
  `).join('');
}

async function carregarPreviaShelf() {
  // 1) Tenta servidor
  if (navigator.onLine) {
    try {
      const res = await fetch('/api/shelf', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const livros = data.livros || [];
        localStorage.setItem('shelfCache', JSON.stringify(livros));
        renderPreviaShelf(livros);
        return;
      }
    } catch (err) {
      console.warn('Shelf offline, usando cache.', err);
    }
  }

  // 2) Cache local
  try {
    const cache = JSON.parse(localStorage.getItem('shelfCache') || '[]');
    renderPreviaShelf(cache);
  } catch (_) {
    renderPreviaShelf([]);
  }
}

// Redireciona para shelf.html (clique ou teclado)
function irParaShelf() {
  window.location.href = 'shelf.html';
}
document.getElementById('previa-shelf')?.addEventListener('click', irParaShelf);
document.getElementById('previa-shelf')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    irParaShelf();
  }
});

// ============================================================
// Carrega perfil: servidor → localStorage → IndexedDB → login
// ============================================================
async function carregarPerfil() {
  // 0) Render imediato do cache (evita tela "Carregando…" offline)
  const local = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
  if (local) renderPerfil(local);

  // 1) Sessão ativa no servidor (fonte da verdade, só se online)
  if (navigator.onLine) {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (res.ok) {
        const user = await res.json();
        renderPerfil(user);
        localStorage.setItem('usuarioLogado', JSON.stringify(user));
        if (window.OfflineDB) {
          try { await window.OfflineDB.salvarUsuario(user); } catch (_) {}
        }
        carregarPreviaShelf();
        return user;
      }
      // 401 → sessão expirou; se temos cache, seguimos offline
      if (res.status === 401 && local) {
        carregarPreviaShelf();
        return local;
      }
    } catch (err) {
      console.warn('Sem conexão com /api/me, usando dados locais.', err);
    }
  }

  // 2) Fallback localStorage
  if (local) {
    carregarPreviaShelf();
    return local;
  }

  // 3) Fallback IndexedDB (sem localStorage prévio)
  if (window.OfflineDB) {
    try {
      const db = await window.OfflineDB.openDB();
      const todos = await new Promise((resolve, reject) => {
        const req = db.transaction('usuarios', 'readonly')
                      .objectStore('usuarios').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror   = () => reject(req.error);
      });
      if (todos.length) {
        const off = todos[0];
        renderPerfil(off);
        localStorage.setItem('usuarioLogado', JSON.stringify(off));
        carregarPreviaShelf();
        return off;
      }
    } catch (err) {
      console.warn('Falha ao ler IndexedDB:', err);
    }
  }

  // 4) Nada em lugar nenhum → só aí manda para login
  //    (mas se estamos offline, avisa em vez de redirecionar)
  if (!navigator.onLine) {
    const nomeEl = document.getElementById('nomePerfil');
    if (nomeEl) nomeEl.textContent = 'Modo offline — faça login quando houver conexão';
    renderPreviaShelf([]);
    return null;
  }

  window.location.href = '/login.html';
  return null;
}

carregarPerfil();

// ============================================================
// Ações
// ============================================================
document.getElementById('editar-perfil')?.addEventListener('click', () => {
  window.location.href = 'editar-perfil.html';
});

document.getElementById('excluir-conta')?.addEventListener('click', async () => {
  if (!confirm('Tem certeza que deseja excluir sua conta?')) return;
  const local = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
  if (!local?.email) return;

  try {
    const res = await fetch('/api/excluir', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: local.email })
    });
    const data = await res.json();
    alert(data.mensagem);
  } catch (err) {
    alert('Erro ao excluir (offline). Tente novamente com internet.');
    return;
  }
  localStorage.removeItem('usuarioLogado');
  localStorage.removeItem('shelfCache');
  window.location.href = '/index.html';
});

document.getElementById('logout')?.addEventListener('click', async () => {
  try { await fetch('/api/logout', { credentials: 'include' }); } catch (_) {}
  localStorage.removeItem('usuarioLogado');
  localStorage.removeItem('shelfCache');
  alert('Você saiu da conta.');
  window.location.href = '/index.html';
});