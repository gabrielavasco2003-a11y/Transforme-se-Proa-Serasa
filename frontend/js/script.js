// ================================================================
// script.js — compartilhado por todas as páginas
// - Mantém o usuário logado (pergunta ao backend /api/me)
// - Alterna entre #nav-visitante e #user-menu
// - Cards de livro abrem book.html?volumeId=...
// - Setas de rolagem nas seções (só no index.html)
// - Botão X para fechar o dropdown + clique fora + ESC
// ================================================================

const IMG_FALLBACK = '/img/sem-capa.jpg';

/* ================= UTILITÁRIO SEGURO ================= */
function safeRun(label, fn) {
  try {
    const r = fn();
    if (r && typeof r.catch === 'function') {
      r.catch(err => console.error(`[safeRun] ${label}:`, err));
    }
  } catch (err) {
    console.error(`[safeRun] ${label}:`, err);
  }
}

/* ================= HELPERS ================= */
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

function renderStars(rating) {
  const r = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

function pickCover(item) {
  const url = item.thumbnail || item.capa || '';
  return url && url.trim() ? url.replace('http://', 'https://') : IMG_FALLBACK;
}

/* ================= SETAS DE ROLAGEM (só index) ================= */
safeRun('setas de rolagem', () => {
  document.querySelectorAll('.arrow').forEach(arrow => {
    arrow.addEventListener('click', () => {
      const livros = arrow.parentElement.querySelector('.livros');
      if (!livros) return;
      const scrollAmount = 200;
      if (arrow.classList.contains('left')) {
        livros.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        livros.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    });
  });
});

/* ================= CARD DE LIVRO ================= */
function criarCardLivro(item) {
  const volumeId = item.volumeId || item.id || '';
  const titulo   = item.title || item.titulo || 'Sem título';
  const rating   = item.averageRating || 0;
  const count    = item.ratingsCount || 0;
  const capa     = pickCover(item);

  const article = document.createElement('article');

  const inner = document.createElement('div');
  inner.className = 'livro-inner';
  inner.innerHTML = `
    <img src="${escapeHtml(capa)}"
         alt="${escapeHtml(titulo)}"
         loading="lazy"
         onerror="this.onerror=null;this.src='${IMG_FALLBACK}'">
    <p class="titulo">${escapeHtml(titulo)}</p>
    <p class="estrelas">${renderStars(rating)}</p>
    <p class="avaliacoes">${count ? count + ' avaliações' : 'Sem avaliações'}</p>
  `;

  if (volumeId) {
    const link = document.createElement('a');
    link.href = `/book.html?volumeId=${encodeURIComponent(volumeId)}`;
    link.className = 'book-link';
    link.setAttribute('aria-label', `Abrir detalhes de ${titulo}`);
    link.appendChild(inner);
    article.appendChild(link);
  } else {
    article.appendChild(inner);
  }

  return article;
}

/* ================= CARREGAMENTO DAS SEÇÕES (só index) ================= */
function getLivrosDiv(sectionName) {
  return document.querySelector(`section.livros-section[data-section="${sectionName}"] .livros`);
}

async function carregarEmAlta() {
  const div = getLivrosDiv('em-alta');
  if (!div) return;
  div.innerHTML = '<p class="carregando">Carregando...</p>';
  try {
    const response = await fetch('/api/books/em-alta');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    div.innerHTML = '';
    if (!data.items || !data.items.length) {
      div.innerHTML = '<p class="vazio">Nenhum livro encontrado.</p>';
      return;
    }
    data.items.forEach(item => div.appendChild(criarCardLivro(item)));
  } catch (err) {
    console.error('Erro ao carregar "Em Alta":', err);
    div.innerHTML = '<p class="erro">Não foi possível carregar os livros.</p>';
  }
}

async function carregarJabuti() {
  const div = getLivrosDiv('jabuti');
  if (!div) return;
  div.innerHTML = '<p class="carregando">Carregando...</p>';
  try {
    const response = await fetch('/data/jabuti.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    div.innerHTML = '';
    if (!Array.isArray(data) || !data.length) {
      div.innerHTML = '<p class="vazio">Nenhum livro encontrado.</p>';
      return;
    }
    data.forEach(item => {
      const normalized = {
        volumeId: item.volumeId || item.id || '',
        title:    item.titulo || item.title || '',
        thumbnail: item.capa || item.thumbnail || '',
        averageRating: item.rating || item.averageRating || 0,
        ratingsCount:  item.ratingsCount || 0
      };
      div.appendChild(criarCardLivro(normalized));
    });
  } catch (err) {
    console.error('Erro ao carregar Jabuti:', err);
    div.innerHTML = '<p class="erro">Não foi possível carregar os livros.</p>';
  }
}

async function carregarNovos() {
  const div = getLivrosDiv('novos');
  if (!div) return;
  div.innerHTML = '<p class="carregando">Carregando...</p>';
  try {
    const response = await fetch('/api/books/novos');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    div.innerHTML = '';
    if (!data.items || !data.items.length) {
      div.innerHTML = '<p class="vazio">Nenhum livro encontrado.</p>';
      return;
    }
    data.items.forEach(item => div.appendChild(criarCardLivro(item)));
  } catch (err) {
    console.error('Erro ao carregar "Novos":', err);
    div.innerHTML = '<p class="erro">Não foi possível carregar os livros.</p>';
  }
}

/* ================= FUNÇÃO AUXILIAR: FECHAR DROPDOWN ================= */
function fecharDropdown() {
  const dropdown = document.getElementById('dropdown');
  const avatar   = document.getElementById('avatar');
  if (dropdown) {
    dropdown.classList.add('hidden');
    dropdown.hidden = true;
  }
  if (avatar) avatar.setAttribute('aria-expanded', 'false');
}

/* ================= FUNÇÃO AUXILIAR: ABRIR/FECHAR DROPDOWN ================= */
function toggleDropdown() {
  const dropdown = document.getElementById('dropdown');
  const avatar   = document.getElementById('avatar');
  if (!dropdown) return;
  const estaAberto = !dropdown.classList.contains('hidden');
  if (estaAberto) {
    dropdown.classList.add('hidden');
    dropdown.hidden = true;
    if (avatar) avatar.setAttribute('aria-expanded', 'false');
  } else {
    dropdown.classList.remove('hidden');
    dropdown.hidden = false;
    if (avatar) avatar.setAttribute('aria-expanded', 'true');
  }
}

/* ================= HEADER: listeners diretos (à prova de balas) ================= */
function bindHeaderListeners() {
  const avatar       = document.getElementById('avatar');
  const dropdown     = document.getElementById('dropdown');
  const fecharBtn    = document.getElementById('fechar-dropdown');
  const userMenu     = document.getElementById('user-menu');
  const logoutBtn    = document.getElementById('logout');

  if (!avatar || !dropdown) return;

  // ---- Avatar: alterna o dropdown ----
  // Usa cloneNode para remover listeners antigos e evitar duplicação
  const novoAvatar = avatar.cloneNode(true);
  avatar.parentNode.replaceChild(novoAvatar, avatar);

  novoAvatar.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDropdown();
  });

  // ---- Botão X: fecha o dropdown ----
  // Reanexa direto no botão (não depende de listener global)
  if (fecharBtn) {
    const novoFechar = fecharBtn.cloneNode(true);
    fecharBtn.parentNode.replaceChild(novoFechar, fecharBtn);

    novoFechar.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fecharDropdown();
    });

    // Fallback: pointerdown também, caso algum outro script bloqueie o click
    novoFechar.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
  }

  // ---- Logout ----
  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = 'true';
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await fetch('/api/logout', { credentials: 'same-origin' });
      } catch (_) { /* ignora */ }
      window.location.href = '/index.html';
    });
  }

  // ---- Clique fora do menu fecha ----
  // Registra UMA vez (se ainda não registrado)
  if (!window.__headerOutsideBound) {
    window.__headerOutsideBound = true;
    document.addEventListener('click', (e) => {
      const um = document.getElementById('user-menu');
      const dd = document.getElementById('dropdown');
      if (!um || !dd) return;
      // Se clicou dentro do user-menu, não faz nada (avatar/X já cuidam)
      if (um.contains(e.target)) return;
      // Se clicou fora, fecha
      fecharDropdown();
    });
  }

  // ---- ESC fecha ----
  if (!window.__headerEscBound) {
    window.__headerEscBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      fecharDropdown();
    });
  }
}

/* ================= SESSÃO / LOGIN PERSISTENTE ================= */
async function checarSessao() {
  const navVisitante = document.getElementById('nav-visitante');
  const userMenu     = document.getElementById('user-menu');
  const avatarInit   = document.getElementById('avatar-initial');

  if (!navVisitante && !userMenu) return;

  let user = null;
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (res.ok) user = await res.json();
  } catch (_) { /* sem backend → trata como visitante */ }

  if (user) {
    // ---- LOGADO ----
    if (navVisitante) {
      navVisitante.hidden = true;
      navVisitante.classList.add('hidden');
      navVisitante.style.display = 'none';
    }
    if (userMenu) {
      userMenu.hidden = false;
      userMenu.classList.remove('hidden');
      userMenu.style.display = 'block';
    }
    if (avatarInit) {
      const nome = user.usuario || user.nome || user.email || '?';
      avatarInit.textContent = String(nome).trim().charAt(0).toUpperCase() || '?';
    }

    // Anexa os listeners do header (avatar, X, logout, clique fora, ESC)
    bindHeaderListeners();
  } else {
    // ---- VISITANTE ----
    if (navVisitante) {
      navVisitante.hidden = false;
      navVisitante.classList.remove('hidden');
      navVisitante.style.display = 'block';
    }
    if (userMenu) {
      userMenu.hidden = true;
      userMenu.classList.add('hidden');
      userMenu.style.display = 'none';
    }
    fecharDropdown();
  }
}

/* ================= INICIALIZAÇÃO BLINDADA ================= */
function init() {
  safeRun('carregarEmAlta', () => carregarEmAlta());
  safeRun('carregarJabuti', () => carregarJabuti());
  safeRun('carregarNovos',  () => carregarNovos());
  safeRun('checarSessao',   () => checarSessao());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}