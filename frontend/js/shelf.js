// ============================================
// SHELF — Minha Estante
// ============================================
// (arquivo completo — substituir tudo)

// ---- Estado global ----
let todosLivros = [];
let historicoFiltros = [];

// ---- Mapa de labels de status ----
const STATUS_LABELS = {
  quero:    "Quero Ver",
  lendo:    "Lendo",
  terminei: "Terminei",
  pausei:   "Pausei",
  desisti:  "Desisti"
};

// ---- Offline banner ----
function mostrarOffline() {
  const banner = document.getElementById("offline-banner");
  if (banner) banner.hidden = navigator.onLine;
}
window.addEventListener('online',  mostrarOffline);
window.addEventListener('offline', mostrarOffline);

// ---- Helpers de API ----
async function getUser() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) return res.json();
    return null;
  } catch (e) {
    return null;
  }
}

async function getLivros() {
  const res = await fetch('/api/shelf');
  if (!res.ok) throw new Error("Erro ao buscar estante");
  const data = await res.json();
  return data.livros || [];
}

// ---- Categorias (datalist) ----
async function carregarCategorias() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error("categories não encontrado");
    const categorias = await res.json();

    const datalist = document.getElementById("genre-list");
    if (!datalist) return;
    datalist.innerHTML = "";

    const lista = Array.isArray(categorias) ? categorias : Object.keys(categorias);
    lista.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      datalist.appendChild(opt);
    });
  } catch (e) {
    console.warn("Não foi possível carregar categorias:", e);
  }
}

// ---- Histórico de filtros (Undo) ----
function capturarEstadoFiltros() {
  return {
    autor:  document.getElementById("author-filter").value,
    ano:    document.getElementById("year-filter").value,
    status: document.getElementById("status-filter").value,
    genero: document.getElementById("genre-filter").value,
    rating: document.querySelector("#rating-filter .star-btn[aria-pressed='true']")?.dataset.value || ""
  };
}

function restaurarEstadoFiltros(estado) {
  document.getElementById("author-filter").value  = estado.autor  || "";
  document.getElementById("year-filter").value    = estado.ano    || "";
  document.getElementById("status-filter").value  = estado.status || "";
  document.getElementById("genre-filter").value   = estado.genero || "";

  document.querySelectorAll("#rating-filter .star-btn").forEach(b => b.setAttribute("aria-pressed", "false"));
  if (estado.rating) {
    const btn = document.querySelector(`#rating-filter .star-btn[data-value='${estado.rating}']`);
    if (btn) btn.setAttribute("aria-pressed", "true");
  }
}

// ---- Carregar estante ----
async function carregarEstante(salvarHistorico = false) {
  const loadingEl   = document.getElementById("loading");
  const noResultsEl = document.getElementById("no-results");
  const container   = document.getElementById("shelf-container");

  loadingEl.hidden = false;
  noResultsEl.hidden = true;
  container.innerHTML = "";

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

    // --- Filtros ---
    const autor = document.getElementById("author-filter").value.trim().toLowerCase();
    if (autor) {
      livros = livros.filter(l => (l.authors || []).some(a => a.toLowerCase().includes(autor)));
    }

    const ano = document.getElementById("year-filter").value.trim();
    if (ano) {
      livros = livros.filter(l => l.publishedDate && String(l.publishedDate).startsWith(ano));
    }

    const status = document.getElementById("status-filter").value;
    if (status) {
      livros = livros.filter(l => (l.status || "") === status);
    }

    const genero = document.getElementById("genre-filter").value.trim().toLowerCase();
    if (genero) {
      livros = livros.filter(l =>
        (l.categories || []).some(c => c.toLowerCase().includes(genero))
      );
    }

    const ratingBtn = document.querySelector("#rating-filter .star-btn[aria-pressed='true']");
    if (ratingBtn) {
      const minRating = parseInt(ratingBtn.dataset.value, 10);
      livros = livros.filter(l => {
        const r = (l.userRating != null) ? l.userRating / 2 : (l.averageRating || 0);
        return r >= minRating;
      });
    }

    renderShelf(livros);
    if (livros.length === 0) noResultsEl.hidden = false;
  } catch (error) {
    console.error("Erro ao carregar estante:", error);
    container.innerHTML = '<p>Erro ao carregar a estante.</p>';
  } finally {
    loadingEl.hidden = true;
  }
}

// ---- Renderizar cards ----
function renderShelf(livros) {
  const container = document.getElementById("shelf-container");
  container.innerHTML = "";

  livros.forEach(l => {
    const card = document.createElement("div");
    card.className = "book-card";

    // 1. Status
    const statusBadge = document.createElement("div");
    statusBadge.className = "status-badge";
    statusBadge.textContent = STATUS_LABELS[l.status] || "Quero Ver";

    // 2. Capa
    const coverDiv = document.createElement("div");
    coverDiv.className = "book-cover";
    const img = document.createElement("img");
    img.src = l.thumbnail || "/img/placeholder.png";
    img.alt = l.title || "Livro";
    img.onerror = () => { img.src = "/img/placeholder.png"; };
    coverDiv.appendChild(img);

    // 3. Info
    const infoDiv = document.createElement("div");
    infoDiv.className = "book-info";

    const title = document.createElement("h3");
    title.className = "book-title";
    title.textContent = l.title || "Sem título";

    const authors = document.createElement("p");
    authors.className = "book-author";
    authors.textContent = (l.authors || []).join(", ") || "Autor desconhecido";

    const year = document.createElement("p");
    year.className = "book-year";
    year.textContent = l.publishedDate ? String(l.publishedDate).substring(0, 4) : "Ano não informado";

    const tagsDiv = document.createElement("div");
    tagsDiv.className = "book-tags";
    (l.categories || []).slice(0, 3).forEach(c => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = c;
      tagsDiv.appendChild(span);
    });

    const desc = document.createElement("p");
    desc.className = "book-description";
    desc.textContent = l.description || "Sem descrição disponível.";

    // 4. Nota (usuário tem prioridade; senão Google)
    const ratingDiv = document.createElement("div");
    ratingDiv.className = "card-rating";
    const nota5 = (l.userRating != null)
      ? Math.round(l.userRating / 2)
      : Math.round(l.averageRating || 0);
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span");
      star.textContent = "★";
      if (i > nota5) star.classList.add("empty-star");
      ratingDiv.appendChild(star);
    }

    // 5. Ações
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "card-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "Editar";
    editBtn.onclick = () => {
      window.location.href = `/edit-shelf.html?volumeId=${encodeURIComponent(l.volumeId)}`;
    };

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "Remover";
    removeBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Tem certeza que deseja remover este livro?")) return;
      try {
        await fetch('/api/shelf/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ volumeId: l.volumeId })
        });
        carregarEstante();
      } catch (err) {
        console.error(err);
        alert("Erro ao remover. Verifique sua conexão.");
      }
    };

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(removeBtn);

    // Montagem
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

    container.appendChild(card);
  });
}

// ============================================
// EVENTOS
// ============================================

// --- Aplicar filtros ---
document.getElementById("apply-filters").addEventListener("click", () => carregarEstante(true));

// --- Remover filtros ---
document.getElementById("clear-filters").addEventListener("click", () => {
  document.getElementById("author-filter").value  = "";
  document.getElementById("year-filter").value    = "";
  document.getElementById("status-filter").value  = "";
  document.getElementById("genre-filter").value   = "";
  document.querySelectorAll("#rating-filter .star-btn").forEach(btn => btn.setAttribute("aria-pressed", "false"));
  historicoFiltros = [];
  carregarEstante();
});

// --- Undo (Excluir último filtro) ---
document.getElementById("undo-filter")?.addEventListener("click", () => {
  if (historicoFiltros.length === 0) {
    alert("Nenhuma alteração de filtro para desfazer.");
    return;
  }
  const estadoAnterior = historicoFiltros.pop();
  restaurarEstadoFiltros(estadoAnterior);
  carregarEstante(false);
});

// --- Estrelas do filtro ---
document.querySelectorAll("#rating-filter .star-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const isPressed = btn.getAttribute("aria-pressed") === "true";
    document.querySelectorAll("#rating-filter .star-btn").forEach(b => b.setAttribute("aria-pressed", "false"));
    if (!isPressed) btn.setAttribute("aria-pressed", "true");
  });
});

// --- Busca ---
document.getElementById('search-btn').onclick = async () => {
  const query = document.getElementById('search-input').value;
  if (!query.trim()) return carregarEstante();

  const loadingEl   = document.getElementById("loading");
  const container   = document.getElementById("shelf-container");
  const noResultsEl = document.getElementById("no-results");

  loadingEl.hidden = false;
  noResultsEl.hidden = true;
  container.innerHTML = "";

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
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

// --- Dropdown do usuário ---
document.getElementById("avatar")?.addEventListener("click", () => {
  document.getElementById("dropdown")?.classList.toggle("hidden");
});

// ============================================
// INICIALIZAÇÃO
// ============================================
mostrarOffline();
carregarCategorias();
carregarEstante();