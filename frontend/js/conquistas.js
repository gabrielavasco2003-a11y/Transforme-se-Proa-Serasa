// ================================================================
// conquistas.js — Estante gamificada com conquistas
// - Adicionar livros (título, gênero, status, nota, ano)
// - Estatísticas automáticas
// - Desbloqueio automático de conquistas
// - Persistência em localStorage (troca por API depois se quiser)
// ================================================================

(function () {
  'use strict';

  const STORAGE_KEY = 'spoiler_estante_livros';

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
        const generos = new Set(concluidos.map(b => (b.genre || '').toLowerCase().trim()).filter(Boolean));
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
          .filter(b => b.status === 'terminei' && b.finishedAt)
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
      check: (books) => books.filter(b => Number(b.rating) === 1).length >= 5
    },
    {
      id: 'classicos',
      name: 'Colecionador de Clássicos',
      desc: 'Adicionar 10 livros publicados antes de 1950',
      icon: '/img/conquistas/colecionador-classicos.png',
      check: (books) => books.filter(b => {
        const ano = Number(b.year);
        return ano > 0 && ano < 1950;
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
          .filter(b => b.status === 'terminei' && b.finishedAt)
          .sort((a, b) => a.finishedAt - b.finishedAt);
        if (!concluidos.length) return false;
        return Number(concluidos[0].rating) === 10;
      }
    }
  ];

  /* ============================================================
     ESTADO
     ============================================================ */
  let books = loadBooks();
  let unlockedIds = new Set();

  /* ============================================================
     PERSISTÊNCIA (localStorage)
     ============================================================ */
  function loadBooks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Erro ao carregar livros:', e);
      return [];
    }
  }

  function saveBooks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch (e) {
      console.warn('Erro ao salvar livros:', e);
    }
  }

  /* ============================================================
     ESTATÍSTICAS
     ============================================================ */
  function computeStats() {
    const total = books.length;
    const concluidos = books.filter(b => b.status === 'terminei').length;
    const andamento = books.filter(b => b.status === 'andamento').length;
    const desistidos = books.filter(b => b.status === 'desisti').length;
    const quero = books.filter(b => b.status === 'quero').length;

    const notas = books.map(b => Number(b.rating)).filter(n => n > 0);
    const media = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : '—';

    return { total, concluidos, andamento, desistidos, quero, media };
  }

  function renderStats() {
    const s = computeStats();
    document.getElementById('stat-total').textContent = s.total;
    document.getElementById('stat-concluidos').textContent = s.concluidos;
    document.getElementById('stat-andamento').textContent = s.andamento;
    document.getElementById('stat-desistidos').textContent = s.desistidos;
    document.getElementById('stat-quero').textContent = s.quero;
    document.getElementById('stat-media').textContent = s.media;
  }

  /* ============================================================
     LISTA DA ESTANTE
     ============================================================ */
  function renderShelf() {
    const container = document.getElementById('shelf-list');
    if (!container) return;

    if (!books.length) {
      container.innerHTML = '<p class="empty-msg">Nenhum livro ainda. Adicione o primeiro!</p>';
      return;
    }

    container.innerHTML = '';
    books.forEach((book, index) => {
      const card = document.createElement('div');
      card.className = `book-card status-${book.status}`;
      const ano = book.year ? `📅 ${book.year}` : '';
      const genero = book.genre ? `📖 ${escapeHtml(book.genre)}` : '';
      const nota = book.rating > 0 ? `⭐ ${book.rating}/10` : '';

      const statusLabel = {
        quero: 'Quero ler',
        andamento: 'Em andamento',
        terminei: 'Terminei',
        desisti: 'Desisti'
      }[book.status] || book.status;

      card.innerHTML = `
        <h3>${escapeHtml(book.title)}</h3>
        <div class="book-meta">
          <span class="book-status-badge">${statusLabel}</span>
          ${genero ? `<span>${genero}</span>` : ''}
          ${ano ? `<span>${ano}</span>` : ''}
          ${nota ? `<span class="book-rating">${nota}</span>` : ''}
        </div>
        <div class="book-actions">
          <button type="button" class="btn-remove" data-index="${index}">Remover</button>
        </div>
      `;
      container.appendChild(card);
    });

    // Botões de remover
    container.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.index);
        books.splice(idx, 1);
        saveBooks();
        renderAll();
      });
    });
  }

  /* ============================================================
     CONQUISTAS
     ============================================================ */
  function checkAchievements() {
    const newlyUnlocked = [];
    ACHIEVEMENTS.forEach(ach => {
      if (unlockedIds.has(ach.id)) return;
      let ok = false;
      try { ok = ach.check(books); } catch (e) { console.warn('Erro ao checar', ach.id, e); }
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
        <img src="${ach.icon}" alt="${ach.name}" class="achievement-icon" onerror="this.style.opacity=0.3">
        <h3>${ach.name}</h3>
        <p>${ach.desc}</p>
      `;
      grid.appendChild(card);
    });
  }

  function notifyUnlocked(list) {
    if (!list.length) return;
    list.forEach((ach, i) => {
      setTimeout(() => {
        alert(`🏆 Conquista desbloqueada!\n\n${ach.name}\n${ach.desc}`);
      }, i * 400);
    });
  }

  /* ============================================================
     FORMULÁRIO
     ============================================================ */
  function bindForm() {
    const form = document.getElementById('add-book-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = document.getElementById('book-title').value.trim();
      if (!title) return;

      const book = {
        title,
        genre: document.getElementById('book-genre').value.trim(),
        status: document.getElementById('book-status').value,
        rating: Number(document.getElementById('book-rating').value) || 0,
        year: Number(document.getElementById('book-year').value) || 0,
        addedAt: Date.now(),
        finishedAt: document.getElementById('book-status').value === 'terminei' ? Date.now() : null
      };

      books.push(book);
      saveBooks();

      const unlocked = checkAchievements();
      renderAll();
      notifyUnlocked(unlocked);

      form.reset();
      document.getElementById('book-title').focus();
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
    renderShelf();
    renderAchievements();
  }

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */
  function init() {
    checkAchievements();   // recalcula conquistas com base nos livros salvos
    renderAll();
    bindForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expõe para debug
  window.__estante = { books, ACHIEVEMENTS, renderAll };
})();