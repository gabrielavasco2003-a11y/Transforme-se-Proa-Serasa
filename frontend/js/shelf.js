// shelf.js — Minha Estante

let todosLivros = [];
let historicoFiltros = [];

const STATUS_LABELS = {
  quero:    'Quero Ver',
  lendo:    'Lendo',
  terminei: 'Terminei',
  pausei:   'Pausei',
  desisti:  'Desisti'
};

function mostrarOffline() {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.hidden = navigator.onLine;
}
window.addEventListener('online',  mostrarOffline);
window.addEventListener('offline', mostrarOffline);

async function getUser() {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (res.ok) return res.json();
  } catch (_) {}
  return null;
}

async function getLivros() {
  const res = await fetch('/api/shelf', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Erro ao buscar estante');
  const data = await res.json();
  return data.livros || [];
}

async function carregarCategorias() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('categories não encontrado');
    const categorias = await res.json();
    const datalist = document.getElementById('genre-list');
    if (!datalist) return;
    datalist.innerHTML = '';
    const lista = Array.isArray(categorias) ? categorias : Object.keys(categorias);
    lista.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      datalist.appendChild(opt);
    });
  } catch (e) {
    console.warn('Não foi possível carregar categorias:', e);
  }
}

function capturarEstadoFiltros() {
  return {
    autor:  document.getElementById('author-filter').value,
    ano:    document.getElementById('year-filter').value,
    status: document.getElementById('status-filter').value,
    genero: document.getElementById('genre-filter').value,
    rating: document.querySelector("#rating-filter .star-btn[aria-pressed='true']")?.dataset.value || ''
  };
}

function restaurarEstadoFiltros(estado) {
  document.getElementById('author-filter').value = estado.autor || '';
  document.getElementById('year-filter').value   = estado.ano   || '';
  document.getElementById('status-filter').value = estado.status || '';
  document.getElementById('genre-filter').value  = estado.genero || '';
  document.querySelectorAll('#rating-filter .star-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
  if (estado.rating) {
    const btn = document.querySelector(`#rating-filter .star-btn[data-value='${estado.rating}']`);
    if (btn) btn.setAttribute('aria-pressed', 'true');
  }
}

async function carregarEstante(salvarHistorico = false) {
  const loadingEl   = document.getElementById('loading');
  const noResultsEl = document.getElementById('no-results');
  const container   = document.getElementById('shelf-container');

  loadingEl.hidden = false;
  noResultsEl.hidden = true;
  container.innerHTML = '';

  const user = await getUser();
  if (!user) {
    container.innerHTML = '<p>Faça login para ver sua estante.</p>';
    loadingEl.hidden = true;
    return;
  }

  if (salvarHistorico) historicoFiltros.push(capturarEstadoFiltros());

  try {
    let livros = await getLivros();
    todosLivros = [...livros];

    const autor = document.getElementById('author-filter').value.trim().toLowerCase();
    if (autor) livros = livros.filter(l => (l.authors || []).some(a => a.toLowerCase().includes(autor)));

    const ano = document.getElementById('year-filter').value.trim();
    if (ano) livros = livros.filter(l => l.publishedDate && String(l.publishedDate).startsWith(ano));

    const status = document.getElementById('status-filter').value;
    if (status) livros = livros.filter(l => (l.status || '') === status);

    const genero = document.getElementById('genre-filter').value.trim().toLowerCase();
    if (genero) livros = livros.filter(l => (l.categories || []).some(c => c.toLowerCase().includes(genero)));

    const ratingBtn = document.querySelector("#rating-filter .star-btn[aria-pressed='true']");
    if (ratingBtn) {
      const minRating = parseInt(ratingBtn.dataset.value, 10);
      livros = livros.filter(l => {
        const nota5 = (l.userRating != null) ? (l.userRating / 2) : 0;
        return nota5 >= minRating;
      });
    }

    renderShelf(livros);
    if (livros.length === 0) noResultsEl.hidden = false;
  } catch (error) {
    console.error('Erro ao carregar estante:', error);
    container.innerHTML = '<p>Erro ao carregar a estante.</p>';
  } finally {
    loadingEl.hidden = true;
  }
}

function renderShelf(livros) {
  const container = document.getElementById('shelf-container');
  container.innerHTML = '';

  livros.forEach(l => {
    const card = document.createElement('div');
    card.className = 'book-card';

    // ✅ Card inteiro é clicável → vai pra /book.html?volumeId=...
    if (l.volumeId) {
      card.dataset.volumeId = l.volumeId;
      card.setAttribute('role', 'link');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Abrir detalhes de ${l.title || 'livro'}`);
      card.classList.add('card-clickable');
    }

    const statusBadge = document.createElement('div');
    statusBadge.className = 'status-badge';
    statusBadge.textContent = STATUS_LABELS[l.status] || 'Quero Ver';

    const coverDiv = document.createElement('div');
    coverDiv.className = 'book-cover';
    const img = document.createElement('img');
    img.src = l.thumbnail || '/img/placeholder.png';
    img.alt = l.title || 'Livro';
    img.onerror = () => { img.src = '/img/placeholder.png'; };
    coverDiv.appendChild(img);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'book-info';

    const title = document.createElement('h3');
    title.className = 'book-title';
    title.textContent = l.title || 'Sem título';

    const authors = document.createElement('p');
    authors.className = 'book-author';
    authors.textContent = (l.authors || []).join(', ') || 'Autor desconhecido';

    const year = document.createElement('p');
    year.className = 'book-year';
    year.textContent = l.publishedDate ? String(l.publishedDate).substring(0, 4) : 'Ano não informado';

    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'book-tags';
    (l.categories || []).slice(0, 3).forEach(c => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = c;
      tagsDiv.appendChild(span);
    });

    const desc = document.createElement('p');
    desc.className = 'book-description';
    desc.textContent = l.description || 'Sem descrição disponível.';

    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'card-rating';
    const nota5 = (l.userRating != null)
      ? Math.round(l.userRating / 2)
      : Math.round(l.averageRating || 0);
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.textContent = '★';
      if (i > nota5) star.classList.add('empty-star');
      ratingDiv.appendChild(star);
    }

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.type = 'button';
    editBtn.textContent = 'Editar';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      window.location.href = `/edit-shelf.html?volumeId=${encodeURIComponent(l.volumeId)}`;
    };

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remover';
    removeBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('Tem certeza que deseja remover este livro?')) return;
      try {
        await fetch('/api/shelf/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ volumeId: l.volumeId })
        });
        carregarEstante();
      } catch (err) {
        console.error(err);
        alert('Erro ao remover. Verifique sua conexão.');
      }
    };

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(removeBtn);

    infoDiv.appendChild(title);
    infoDiv.appendChild(authors);
    infoDiv.appendChild(year);
    infoDiv.appendChild(tagsDiv);
    infoDiv.appendChild(desc);
    infoDiv.appendChild(ratingDiv);

    card.appendChild(statusBadge);
    card.appendChild(coverDiv);
    card.appendChild(infoDiv);
    card.appendChild(actionsDiv);

    // ✅ Clique no card (fora de botões) → abre o livro
    if (l.volumeId) {
      card.addEventListener('click', (e) => {
        // Se clicou em botão, link, ou algo com ação → ignora
        if (e.target.closest('button, a, input, select, textarea')) return;
        window.location.href = `/book.html?volumeId=${encodeURIComponent(l.volumeId)}`;
      });

      // Acessibilidade: Enter/Space também abre
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = `/book.html?volumeId=${encodeURIComponent(l.volumeId)}`;
        }
      });
    }

    container.appendChild(card);
  });
}

/* ===== EVENTOS ===== */
document.getElementById('apply-filters').addEventListener('click', () => carregarEstante(true));

document.getElementById('clear-filters').addEventListener('click', () => {
  document.getElementById('author-filter').value  = '';
  document.getElementById('year-filter').value    = '';
  document.getElementById('status-filter').value  = '';
  document.getElementById('genre-filter').value   = '';
  document.querySelectorAll('#rating-filter .star-btn').forEach(btn => btn.setAttribute('aria-pressed', 'false'));
  historicoFiltros = [];
  carregarEstante();
});

document.getElementById('undo-filter')?.addEventListener('click', () => {
  if (historicoFiltros.length === 0) {
    alert('Nenhuma alteração de filtro para desfazer.');
    return;
  }
  const estadoAnterior = historicoFiltros.pop();
  restaurarEstadoFiltros(estadoAnterior);
  carregarEstante(false);
});

document.querySelectorAll('#rating-filter .star-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const isPressed = btn.getAttribute('aria-pressed') === 'true';
    document.querySelectorAll('#rating-filter .star-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
    if (!isPressed) btn.setAttribute('aria-pressed', 'true');
  });
});

// Busca
document.getElementById('search-btn').onclick = async () => {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return carregarEstante();

  const loadingEl   = document.getElementById('loading');
  const container   = document.getElementById('shelf-container');
  const noResultsEl = document.getElementById('no-results');

  loadingEl.hidden = false;
  noResultsEl.hidden = true;
  container.innerHTML = '';

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      credentials: 'same-origin'
    });
    const data = await res.json();
    const livros = data.livros || [];
    renderShelf(livros);
    noResultsEl.hidden = livros.length > 0;
  } catch (e) {
    console.error(e);
    container.innerHTML = '<p>Erro na busca.</p>';
  } finally {
    loadingEl.hidden = true;
  }
};

document.getElementById('search-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('search-btn').click();
});

/* ===== INIT ===== */
mostrarOffline();
carregarCategorias();
carregarEstante();