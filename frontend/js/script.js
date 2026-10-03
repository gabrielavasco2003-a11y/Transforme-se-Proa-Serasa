// ================================================================
// script.js — compartilhado por todas as páginas
// - Mantém o usuário logado (pergunta ao backend /api/me)
// - Alterna entre #nav-visitante e #user-menu
// - Cards de livro abrem book.html?volumeId=...
// - Setas de rolagem nas seções (só no index.html)
// ================================================================

const IMG_FALLBACK = '/img/sem-capa.jpg';

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
  if (!div) return; // se não existir nesta página, sai silenciosamente
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

/* ================= SESSÃO / LOGIN PERSISTENTE ================= */
let _sessionBound = false; // evita duplicar listeners se checarSessao rodar 2x

async function checarSessao() {
  const navVisitante = document.getElementById('nav-visitante');
  const userMenu     = document.getElementById('user-menu');
  const avatar       = document.getElementById('avatar');
  const avatarInit   = document.getElementById('avatar-initial');
  const dropdown     = document.getElementById('dropdown');
  const logoutBtn    = document.getElementById('logout');

  // Se esta página não tem header (raro), sai
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

    if (!_sessionBound) {
      _sessionBound = true;

      // Alternar dropdown
      if (avatar && dropdown) {
        avatar.addEventListener('click', (e) => {
          e.stopPropagation();
          const aberto = !dropdown.classList.contains('hidden');
          dropdown.classList.toggle('hidden', aberto);
          dropdown.hidden = aberto;
          avatar.setAttribute('aria-expanded', String(!aberto));
        });
        document.addEventListener('click', (e) => {
          if (userMenu && !userMenu.contains(e.target)) {
            dropdown.classList.add('hidden');
            dropdown.hidden = true;
            avatar.setAttribute('aria-expanded', 'false');
          }
        });
      }

      // Logout
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await fetch('/api/logout', { credentials: 'same-origin' });
          } catch (_) { /* ignora */ }
          window.location.href = '/index.html';
        });
      }
    }
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
  }
}

/* ================= INICIALIZAÇÃO SEGURA ================= */
function init() {
  // Carrega seções (só rodam se existirem)
  carregarEmAlta();
  carregarJabuti();
  carregarNovos();

  // Toggle de login/visitante
  checarSessao();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}