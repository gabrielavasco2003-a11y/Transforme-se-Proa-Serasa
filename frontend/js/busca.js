/* busca.js - busca em tempo real + filtros + tradução de categorias
   + redirecionamento para book.html
   + leitura do parâmetro ?q= vindo do index.html
   + proxy via backend (/api/books/search) — a chave NÃO fica no front */

const API_BASE = "/api/books/search";
const CATEGORIES_URL = "/data/categories.json";

/* ---------- helper seguro para pegar elementos ---------- */
const $ = (id) => document.getElementById(id);

/* ---------- mapa de elementos do DOM ---------- */
const dom = {
  searchForm:            $("search-form"),
  searchInput:           $("search-input"),
  searchButton:          $("search-btn"),
  booksContainer:        $("books-container"),
  loading:               $("loading"),
  noResults:             $("no-results"),
  ratingFilter:          $("rating-filter"),
  categorySearch:        $("category-search"),
  addCategoryBtn:        $("add-category"),
  includeCategoriesList: $("include-categories"),
  categorySuggestions:   $("category-suggestions"),
  excludeSearch:         $("exclude-search"),
  addExcludeBtn:         $("add-exclude"),
  excludeCategoriesList: $("exclude-categories"),
  excludeSuggestions:    $("exclude-suggestions"),
  authorFilter:          $("author-filter"),
  yearFilter:            $("year-filter"),
  applyFiltersBtn:       $("apply-filters"),
  clearFiltersBtn:       $("clear-filters"),
  topCategoryName:       $("top-category-name"),
  resultsTitle:          $("results-title")
};

/* ---------- estado ---------- */
const state = {
  query: "",
  rating: 0,
  includeCategories: [],
  excludeCategories: [],
  author: "",
  year: "",
  availableCategories: new Set()
};

/* ================= MAPA DE CATEGORIAS ================= */
let categoryMap = {};
let reverseMap = {};

async function loadCategoryMap() {
  try {
    const res = await fetch(CATEGORIES_URL);
    if (!res.ok) throw new Error("categories.json não encontrado: " + res.status);
    categoryMap = await res.json();
    rebuildReverseMap();
    Object.keys(categoryMap).forEach(pt => state.availableCategories.add(pt));
    console.log("✅ Categorias carregadas:", Object.keys(categoryMap).length, "entradas");
  } catch (e) {
    console.warn("⚠️ Falha ao carregar categories.json:", e);
    categoryMap = {};
    reverseMap = {};
  }
}

function rebuildReverseMap() {
  reverseMap = {};
  Object.entries(categoryMap).forEach(([pt, list]) => {
    (list || []).forEach(en => {
      reverseMap[String(en).toLowerCase().trim()] = pt;
    });
  });
}

function toDisplayCategory(apiCat) {
  if (!apiCat) return null;
  const key = String(apiCat).toLowerCase().trim();
  if (reverseMap[key]) return reverseMap[key];
  const hit = Object.keys(reverseMap).find(k => key.includes(k));
  return hit ? reverseMap[hit] : null;
}

function toApiCategoryList(displayCat) {
  if (!displayCat) return [];
  const trimmed = displayCat.trim();
  const key = Object.keys(categoryMap).find(k => k.toLowerCase() === trimmed.toLowerCase());
  if (key) return categoryMap[key];
  return [trimmed];
}

/* ================= util: debounce ================= */
function debounce(fn, wait = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* ================= fetch helper (via backend) ================= */
async function fetchBooksRaw(q, params = {}) {
  const url = new URL(API_BASE, window.location.origin);
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", String(params.maxResults || 20));
  if (params.startIndex) url.searchParams.set("startIndex", String(params.startIndex));
  if (params.orderBy)    url.searchParams.set("orderBy", params.orderBy);

  const res = await fetch(url.toString(), { credentials: "same-origin" });

  if (!res.ok) {
    let detalhe = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detalhe = body?.error?.message || body?.mensagem || detalhe;
    } catch (_) { /* corpo não-JSON */ }
    throw new Error(detalhe);
  }

  return res.json();
}

/* ================= notas em lote (nosso banco) ================= */
async function fetchRatingsBatch(volumeIds) {
  if (!volumeIds || !volumeIds.length) return {};
  try {
    const ids = volumeIds.slice(0, 100).join(',');
    const res = await fetch(`/api/ratings/batch?ids=${encodeURIComponent(ids)}`, {
      credentials: 'same-origin'
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.ratings || {};
  } catch (e) {
    console.warn('Erro ao buscar notas em lote:', e);
    return {};
  }
}

/* ================= livros manuais (catálogo comunitário) ================= */
async function fetchCommunityBooks(q) {
  try {
    const url = `/api/search?q=${encodeURIComponent(q || '')}&limit=24`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.livros || []).map(item => ({
      id: item.volumeId || item.isbn || '',
      title: item.title || 'Sem título',
      authors: item.authors || [],
      year: item.publishedDate ? String(item.publishedDate).split('-')[0] : 'Desconhecido',
      categories: item.categories || [],
      apiCategories: item.categories || [],
      rating: 0,
      thumbnail: item.thumbnail || '',
      description: item.description || '',
      manual: true
    }));
  } catch (e) {
    console.warn('Erro ao buscar livros manuais:', e);
    return [];
  }
}

/* ================= normalização (não filtra mais) ================= */
function filterAndNormalize(items) {
  if (!items) return [];

  return items.map(item => {
    const info = item.volumeInfo || {};
    const displayCats = Array.from(new Set(
      (info.categories || []).map(toDisplayCategory).filter(Boolean)
    ));

    return {
      id: item.id || (info.industryIdentifiers?.[0]?.identifier) || "",
      title: info.title || "Sem título",
      authors: info.authors || [],
      year: info.publishedDate ? info.publishedDate.split("-")[0] : "Desconhecido",
      categories: displayCats,
      apiCategories: info.categories || [],
      rating: info.averageRating || 0,
      thumbnail: info.imageLinks?.thumbnail?.replace("http://", "https://") || "",
      description: info.description || ""
    };
  });
}

/* ================= aplicar TODOS os filtros ================= */
function applyAllFilters(books) {
  const includeApiLists = state.includeCategories.map(toApiCategoryList);
  const excludeApiLists = state.excludeCategories.map(toApiCategoryList);

  return books.filter(b => {
    // Filtro de avaliação (nota do banco é 0-10; filtro em estrelas 0-5)
    if (state.rating && ((b.rating || 0) / 2) < state.rating) return false;

    // Filtro de autor
    if (state.author) {
      const authors = (b.authors || []).join(" ").toLowerCase();
      if (!authors.includes(state.author.toLowerCase())) return false;
    }

    // Filtro de ano
    if (state.year && String(b.year) !== String(state.year)) return false;

    // Filtro de gênero (incluir)
    if (includeApiLists.length) {
      const cats = (b.apiCategories || b.categories || []).map(c => String(c).toLowerCase());
      const allMatch = includeApiLists.every(list =>
        list.some(api => cats.some(c => c.includes(api.toLowerCase())))
      );
      if (!allMatch) return false;
    }

    // Filtro de categoria (excluir)
    if (excludeApiLists.length) {
      const cats = (b.apiCategories || b.categories || []).map(c => String(c).toLowerCase());
      const anyExcluded = excludeApiLists.some(list =>
        list.some(api => cats.some(c => c.includes(api.toLowerCase())))
      );
      if (anyExcluded) return false;
    }

    return true;
  });
}

/* ================= render ================= */
function renderBooks(items) {
  if (!dom.booksContainer) return;
  dom.booksContainer.innerHTML = "";
  if (dom.noResults) dom.noResults.hidden = true;

  if (!items.length) {
    if (dom.noResults) dom.noResults.hidden = false;
    return;
  }

  items.forEach(b => {
    const el = document.createElement("article");
    el.className = "book";
    const href = b.id ? `/book.html?volumeId=${encodeURIComponent(b.id)}` : "#";
    const cats = b.categories.length
      ? b.categories.map(c => `<span>${escapeHtml(c)}</span>`).join("")
      : `<span>Outros</span>`;

    el.innerHTML = `
      <a href="${href}" class="book-link">
        <img src="${b.thumbnail}" alt="${escapeHtml(b.title)}" />
        <div class="book-info">
          <h3>${escapeHtml(b.title)}</h3>
          <p><strong>Autor:</strong> ${escapeHtml(b.authors.join(", ") || "Desconhecido")}</p>
          <p><strong>Ano:</strong> ${escapeHtml(b.year)}</p>
          <div class="book-cats">${cats}</div>
          <p style="margin-top:8px"><strong>Avaliação:</strong> ${renderStars(b.rating)}</p>
          <p>${escapeHtml(truncate(b.description, 180))}</p>
        </div>
      </a>
    `;
    dom.booksContainer.appendChild(el);
  });
}

/* ================= helpers ================= */
function renderStars(rating) {
  let r = Math.round((rating || 0) / 2);
  r = Math.max(0, Math.min(5, r));
  return "★".repeat(r) + "☆".repeat(5 - r);
}
function truncate(text, n) {
  return text ? (text.length > n ? text.slice(0, n) + "..." : text) : "Sem descrição";
}
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, s => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]
  ));
}

/* ================= UI: lista de categorias ================= */
function renderCategoryLists() {
  if (dom.includeCategoriesList) dom.includeCategoriesList.innerHTML = "";
  if (dom.excludeCategoriesList) dom.excludeCategoriesList.innerHTML = "";

  state.includeCategories.forEach(cat => {
    if (!dom.includeCategoriesList) return;
    const li = document.createElement("li");
    li.innerHTML = `${escapeHtml(cat)} <button aria-label="remover ${escapeHtml(cat)}" data-cat="${escapeHtml(cat)}" data-type="include">✕</button>`;
    dom.includeCategoriesList.appendChild(li);
  });

  state.excludeCategories.forEach(cat => {
    if (!dom.excludeCategoriesList) return;
    const li = document.createElement("li");
    li.innerHTML = `${escapeHtml(cat)} <button aria-label="remover ${escapeHtml(cat)}" data-cat="${escapeHtml(cat)}" data-type="exclude">✕</button>`;
    dom.excludeCategoriesList.appendChild(li);
  });
}

function addCategory(cat, type = "include") {
  if (!cat) return;
  cat = cat.trim();
  if (!cat) return;
  if (type === "include") {
    if (!state.includeCategories.includes(cat)) state.includeCategories.push(cat);
  } else {
    if (!state.excludeCategories.includes(cat)) state.excludeCategories.push(cat);
  }
  renderCategoryLists();
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-cat]");
  if (!btn) return;
  const cat = btn.dataset.cat;
  const type = btn.dataset.type;
  if (type === "include") {
    state.includeCategories = state.includeCategories.filter(c => c !== cat);
  } else {
    state.excludeCategories = state.excludeCategories.filter(c => c !== cat);
  }
  renderCategoryLists();
  performSearch(state.query || (dom.searchInput ? dom.searchInput.value : "") || "");
});

/* ================= sugestões ================= */
function showSuggestions(container, items) {
  if (!container) return;
  container.innerHTML = "";
  if (!items || !items.length) { container.hidden = true; return; }
  items.slice(0, 10).forEach(i => {
    const div = document.createElement("div");
    div.textContent = i;
    div.addEventListener("click", () => {
      if (container === dom.categorySuggestions) addCategory(i, "include");
      else addCategory(i, "exclude");
      container.hidden = true;
      performSearch(state.query || (dom.searchInput ? dom.searchInput.value : "") || "");
    });
    container.appendChild(div);
  });
  container.hidden = false;
}

function suggestCategoriesFromInput(inputValue) {
  const q = (inputValue || "").toLowerCase().trim();
  const all = Object.keys(categoryMap);
  if (!q) return all.slice(0, 12);
  return all.filter(c => c.toLowerCase().includes(q)).slice(0, 12);
}

/* ================= rating filter ================= */
if (dom.ratingFilter) {
  dom.ratingFilter.addEventListener("click", (e) => {
    const btn = e.target.closest(".star-btn");
    if (!btn) return;

    const val = Number(btn.dataset.value);
    state.rating = (state.rating === val) ? 0 : val;

    dom.ratingFilter.querySelectorAll(".star-btn").forEach(b => {
      const v = Number(b.dataset.value);
      const active = v <= state.rating;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });

    performSearch(state.query || (dom.searchInput ? dom.searchInput.value : "") || "");
  });
}

/* ================= inputs de categoria ================= */
if (dom.categorySearch) {
  dom.categorySearch.addEventListener("input", debounce((e) => {
    showSuggestions(dom.categorySuggestions, suggestCategoriesFromInput(e.target.value));
  }, 150));

  dom.categorySearch.addEventListener("focus", () => {
    showSuggestions(dom.categorySuggestions, suggestCategoriesFromInput(dom.categorySearch.value));
  });
}

if (dom.excludeSearch) {
  dom.excludeSearch.addEventListener("input", debounce((e) => {
    showSuggestions(dom.excludeSuggestions, suggestCategoriesFromInput(e.target.value));
  }, 150));

  dom.excludeSearch.addEventListener("focus", () => {
    showSuggestions(dom.excludeSuggestions, suggestCategoriesFromInput(dom.excludeSearch.value));
  });
}

if (dom.addCategoryBtn) {
  dom.addCategoryBtn.addEventListener("click", () => {
    addCategory(dom.categorySearch ? dom.categorySearch.value : "", "include");
    if (dom.categorySearch) dom.categorySearch.value = "";
    if (dom.categorySuggestions) dom.categorySuggestions.hidden = true;
    performSearch(state.query || (dom.searchInput ? dom.searchInput.value : "") || "");
  });
}

if (dom.addExcludeBtn) {
  dom.addExcludeBtn.addEventListener("click", () => {
    addCategory(dom.excludeSearch ? dom.excludeSearch.value : "", "exclude");
    if (dom.excludeSearch) dom.excludeSearch.value = "";
    if (dom.excludeSuggestions) dom.excludeSuggestions.hidden = true;
    performSearch(state.query || (dom.searchInput ? dom.searchInput.value : "") || "");
  });
}

/* ================= apply / clear ================= */
if (dom.applyFiltersBtn) {
  dom.applyFiltersBtn.addEventListener("click", () => {
    state.author = dom.authorFilter ? dom.authorFilter.value.trim() : "";
    state.year = dom.yearFilter && dom.yearFilter.value ? String(dom.yearFilter.value) : "";
    performSearch(state.query || (dom.searchInput ? dom.searchInput.value : "") || "");
  });
}

if (dom.clearFiltersBtn) {
  dom.clearFiltersBtn.addEventListener("click", () => {
    state.rating = 0;
    state.includeCategories = [];
    state.excludeCategories = [];
    state.author = "";
    state.year = "";
    if (dom.authorFilter) dom.authorFilter.value = "";
    if (dom.yearFilter) dom.yearFilter.value = "";
    if (dom.categorySearch) dom.categorySearch.value = "";
    if (dom.excludeSearch) dom.excludeSearch.value = "";
    renderCategoryLists();
    if (dom.ratingFilter) {
      dom.ratingFilter.querySelectorAll(".star-btn").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
    }
    performSearch("");
  });
}

/* ================= form / live search ================= */
if (dom.searchForm) {
  dom.searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = dom.searchInput ? dom.searchInput.value.trim() : "";
    state.query = q;
    performSearch(q);
  });
}

if (dom.searchInput) {
  dom.searchInput.addEventListener("input", debounce((e) => {
    const q = e.target.value.trim();
    state.query = q;
    performSearch(q);
  }, 450));
}

/* ================= busca principal ================= */
async function performSearch(query) {
  if (dom.loading) dom.loading.hidden = false;
  if (dom.booksContainer) dom.booksContainer.innerHTML = "";
  if (dom.noResults) dom.noResults.hidden = true;

  try {
    let q = query ? `${query}` : "subject:fiction";
    if (state.author) q += `+inauthor:${state.author}`;

    // 1) Busca em paralelo: Google Books + catálogo comunitário
    const [raw, community] = await Promise.all([
      fetchBooksRaw(q, { maxResults: 24, orderBy: "relevance" }).catch(() => ({ items: [] })),
      fetchCommunityBooks(query)
    ]);

    const items = raw.items || [];
    updateTopCategory(items);

    // 2) Normaliza Google Books
    const normalizados = filterAndNormalize(items);

    // 3) Adiciona livros comunitários (sem duplicar)
    const idsGoogle = new Set(normalizados.map(b => b.id));
    const comunitarios = community.filter(b => !idsGoogle.has(b.id));

    const todos = [...normalizados, ...comunitarios];

    // 4) Busca as notas REAIS do nosso banco em lote
    const ids = todos.map(b => b.id).filter(Boolean);
    const ratings = await fetchRatingsBatch(ids);

    // 5) Aplica as notas reais nos cards
    todos.forEach(b => {
      const r = ratings[b.id];
      if (r) {
        b.rating = r.media;
        b.ratingsCount = r.total;
      } else {
        b.rating = 0;
        b.ratingsCount = 0;
      }
    });

    // 6) Aplica TODOS os filtros
    const filtrados = applyAllFilters(todos);

    renderBooks(filtrados);
  } catch (err) {
    console.error(err);
    if (dom.booksContainer) dom.booksContainer.innerHTML = "";
    if (dom.noResults) {
      dom.noResults.hidden = false;
      dom.noResults.textContent = "Erro ao buscar: " + err.message;
    }
  } finally {
    if (dom.loading) dom.loading.hidden = true;
  }
}

/* ================= top category (traduzida) ================= */
function updateTopCategory(items) {
  const counts = {};
  (items || []).forEach(it => {
    (it.volumeInfo?.categories || []).forEach(c => {
      const display = toDisplayCategory(c);
      if (!display) return;
      counts[display] = (counts[display] || 0) + 1;
    });
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = entries.length ? entries[0][0] : "Livros";
  if (dom.topCategoryName) dom.topCategoryName.textContent = top;
}

/* ================= initial load (sugestões) ================= */
async function initialLoad() {
  if (dom.resultsTitle) dom.resultsTitle.textContent = "Melhores Avaliados";
  if (dom.topCategoryName) dom.topCategoryName.textContent = "—";
  if (dom.loading) dom.loading.hidden = false;

  try {
    const res = await fetchBooksRaw("subject:fiction", { maxResults: 30, orderBy: "relevance" });
    const items = res.items || [];
    updateTopCategory(items);

    const normalizados = filterAndNormalize(items);

    const ids = normalizados.map(b => b.id).filter(Boolean);
    const ratings = await fetchRatingsBatch(ids);

    normalizados.forEach(b => {
      const r = ratings[b.id];
      b.rating = r ? r.media : 0;
      b.ratingsCount = r ? r.total : 0;
    });

    const sorted = normalizados.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
    renderBooks(sorted.slice(0, 12));
  } catch (err) {
    console.error(err);
    if (dom.noResults) {
      dom.noResults.hidden = false;
      dom.noResults.textContent = "Erro ao carregar sugestões: " + err.message;
    }
  } finally {
    if (dom.loading) dom.loading.hidden = true;
  }
}

/* ================= top category click ================= */
if (dom.topCategoryName) {
  dom.topCategoryName.addEventListener("click", () => {
    const cat = dom.topCategoryName.textContent;
    if (cat && cat !== "—") {
      if (dom.searchInput) dom.searchInput.value = cat;
      state.query = cat;
      performSearch(cat);
    }
  });
}

/* ================= a11y ================= */
[dom.categorySuggestions, dom.excludeSuggestions].forEach(s => {
  if (!s) return;
  s.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const first = s.querySelector("div");
      if (first) first.click();
    }
  });
});

/* ================= leitura do ?q= da URL ================= */
function getQueryFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("q") || "";
}

/* ================= START ================= */
(async function init() {
  await loadCategoryMap();
  renderCategoryLists();

  const q = getQueryFromURL();
  if (q) {
    if (dom.searchInput) dom.searchInput.value = q;
    state.query = q;
    if (dom.resultsTitle) dom.resultsTitle.textContent = `Resultados para "${q}"`;
    await performSearch(q);
  } else {
    await initialLoad();
  }
})();

/* expor pro console (debug) */
window.performSearch = performSearch;
window.state = state;