// ================================================================
// conquistas.js — Conquistas baseadas na estante real do usuário
// - Puxa os livros de /api/shelf (backend)
// - Calcula estatísticas e conquistas automaticamente
// - Sem formulário, sem localStorage
// ================================================================

(function () {
  'use strict';

  /* ============================================================
     DEFINIÇÃO DAS CONQUISTAS
     ============================================================ */
  const ACHIEVEMENTS = [
    {
      id: 'explorador',
      name: 'Explorador Literário',
      desc: 'Ler livros de 5 gêneros diferentes',
      icon: '/img/conquistas/explorador-literario.png',
      check: (books) => {
        const concluidos = books.filter(b => b.status === 'terminei');
        const generos = new Set(
          concluidos.flatMap(b => (b.categories || []).map(c => String(c).toLowerCase().trim()))
                     .filter(Boolean)
        );
        return generos.size >= 5;
      }
    },
    {
      id: 'maratonista',
      name: 'Maratonista',
      desc: 'Terminar 3 livros em menos de um mês',
      icon: '/img/conquistas/maratonista.png',
      check: (books) => {
        const concluidos = books
          .filter(b => b.status === 'terminei' && b.updatedAt)
          .map(b => ({ ...b, finishedAt: new Date(b.updatedAt).getTime() }))
          .sort((a, b) => a.finishedAt - b.finishedAt);
        if (concluidos.length < 3) return false;
        for (let i = 0; i <= concluidos.length - 3; i++) {
          const diff = concluidos[i + 2].finishedAt - concluidos[i].finishedAt;
          if (diff <= 30 * 24 * 60 * 60 * 1000) return true;
        }
        return false;
      }
    },
    {
      id: 'critico',
      name: 'Crítico Severíssimo',
      desc: 'Dar nota 1 para pelo menos 5 livros',
      icon: '/img/conquistas/critico-severissimo.png',
      check: (books) => books.filter(b => Number(b.userRating) === 1).length >= 5
    },
    {
      id: 'classicos',
      name: 'Colecionador de Clássicos',
      desc: 'Adicionar 10 livros publicados antes de 1950',
      icon: '/img/conquistas/colecionador-classicos.png',
      check: (books) => books.filter(b => {
        const ano = parseInt(String(b.publishedDate || '').split('-')[0], 10);
        return !isNaN(ano) && ano > 0 && ano < 1950;
      }).length >= 10
    },
    {
      id: 'biblioteca',
      name: 'Biblioteca Viva',
      desc: 'Ter mais de 10 livros na estante',
      icon: '/img/conquistas/biblioteca-viva.png',
      check: (books) => books.length > 10
    },
    {
      id: 'primeiro-amor',
      name: 'Primeiro Amor Literário',
      desc: 'Dar nota 10 para o primeiro livro concluído',
      icon: '/img/conquistas/primeiro-amor.png',
      check: (books) => {
        const concluidos = books
          .filter(b => b.status === 'terminei' && b.updatedAt)
          .map(b => ({ ...b, finishedAt: new Date(b.updatedAt).getTime() }))
          .sort((a, b) => a.finishedAt - b.finishedAt);
        if (!concluidos.length) return false;
        return Number(concluidos[0].userRating) === 10;
      }
    }
  ];

  /* ============================================================
     ESTADO
     ============================================================ */
  let books = [];
  const unlockedIds = new Set();

  /* ============================================================
     FETCH: estante do usuário
     ============================================================ */
  async function fetchShelf() {
    const res = await fetch('/api/shelf', { credentials: 'same-origin' });
    if (res.status === 401) {
      // Não logado → não tem estante
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.livros || [];
  }

  /* ============================================================
     ESTATÍSTICAS
     ============================================================ */
  function computeStats() {
    const total = books.length;
    const concluidos = books.filter(b => b.status === 'terminei').length;
    const andamento = books.filter(b => b.status === 'lendo').length;
    const desistidos = books.filter(b => b.status === 'desisti').length;
    const quero = books.filter(b => b.status === 'quero').length;

    const notas = books.map(b => Number(b.userRating)).filter(n => n > 0);
    const media = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : '—';

    return { total, concluidos, andamento, desistidos, quero, media };
  }

  function renderStats() {
    const s = computeStats();
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('stat-total', s.total);
    set('stat-concluidos', s.concluidos);
    set('stat-andamento', s.andamento);
    set('stat-desistidos', s.desistidos);
    set('stat-quero', s.quero);
    set('stat-media', s.media);
  }

  /* ============================================================
     CONQUISTAS
     ============================================================ */
  function checkAchievements() {
    const newlyUnlocked = [];
    ACHIEVEMENTS.forEach(ach => {
      if (unlockedIds.has(ach.id)) return;
      let ok = false;
      try { ok = ach.check(books); }
      catch (e) { console.warn('Erro ao checar conquista', ach.id, e); }
      if (ok) {
        unlockedIds.add(ach.id);
        newlyUnlocked.push(ach);
      }
    });
    return newlyUnlocked;
  }

  function renderAchievements() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;

    grid.innerHTML = '';
    ACHIEVEMENTS.forEach(ach => {
      const unlocked = unlockedIds.has(ach.id);
      const card = document.createElement('div');
      card.className = `achievement-card ${unlocked ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        ${unlocked ? '<span class="unlocked-badge">✓ Desbloqueada</span>' : ''}
        <img src="${ach.icon}" alt="${ach.name}" class="achievement-icon"
             onerror="this.style.opacity=0.3">
        <h3>${escapeHtml(ach.name)}</h3>
        <p>${escapeHtml(ach.desc)}</p>
      `;
      grid.appendChild(card);
    });
  }

  /* ============================================================
     ESTADO VAZIO / NÃO LOGADO
     ============================================================ */
  function renderEmptyState(msg) {
    const stats = document.querySelector('.stats-section');
    const ach = document.querySelector('.achievements-section');
    // Não esconde — só mostra mensagem no grid de conquistas
    const grid = document.getElementById('achievements-grid');
    if (grid) {
      grid.innerHTML = `<p class="empty-msg" style="grid-column:1/-1;text-align:center;color:#6b6b6b;font-style:italic;padding:20px">${escapeHtml(msg)}</p>`;
    }
    // Zera as estatísticas
    ['stat-total','stat-concluidos','stat-andamento','stat-desistidos','stat-quero','stat-media']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
      });
  }

  /* ============================================================
     UTILS
     ============================================================ */
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
  }

  function renderAll() {
    renderStats();
    renderAchievements();
  }

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */
  async function init() {
    // 1. Verifica se está logado
    let user = null;
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      if (res.ok) user = await res.json();
    } catch (_) { /* sem backend */ }

    if (!user) {
      renderEmptyState('Faça login para ver suas conquistas.');
      return;
    }

    // 2. Busca a estante
    try {
      const livros = await fetchShelf();
      books = Array.isArray(livros) ? livros : [];
    } catch (e) {
      console.error('Erro ao buscar estante:', e);
      renderEmptyState('Não foi possível carregar sua estante.');
      return;
    }

    // 3. Se vazio, avisa
    if (!books.length) {
      renderEmptyState('Sua estante está vazia. Adicione livros em "Minha Estante" para desbloquear conquistas.');
      return;
    }

    // 4. Calcula conquistas + renderiza
    checkAchievements();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Debug
  window.__conquistas = { ACHIEVEMENTS, getBooks: () => books };
})();