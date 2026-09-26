/* busca.js - busca em tempo real + filtros + tradução de categorias
   + redirecionamento para book.html */
const API_KEY = "AIzaSyAu6edO3YMiflVEFdkxbZBRA9ECY-Nt31o";
const API_BASE = "https://www.googleapis.com/books/v1/volumes";
const CATEGORIES_URL = "../data/categories.json"; // html/ → ../data/

const dom = {
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  searchButton: document.getElementById("search-button"),
  booksContainer: document.getElementById("books-container"),
  loading: document.getElementById("loading"),
  noResults: document.getElementById("no-results"),
  ratingFilter: document.getElementById("rating-filter"),
  categorySearch: document.getElementById("category-search"),
  addCategoryBtn: document.getElementById("add-category"),
  includeCategoriesList: document.getElementById("include-categories"),
  categorySuggestions: document.getElementById("category-suggestions"),
  excludeSearch: document.getElementById("exclude-search"),
  addExcludeBtn: document.getElementById("add-exclude"),
  excludeCategoriesList: document.getElementById("exclude-categories"),
  excludeSuggestions: document.getElementById("exclude-suggestions"),
  authorFilter: document.getElementById("author-filter"),
  yearFilter: document.getElementById("year-filter"),
  applyFiltersBtn: document.getElementById("apply-filters"),
  clearFiltersBtn: document.getElementById("clear-filters"),
  topCategoryName: document.getElementById("top-category-name"),
  resultsTitle: document.getElementById("results-title")
};

let state = {
  query: "",
  rating: 0,
  includeCategories: [],
  excludeCategories: [],
  author: "",
  year: "",
  availableCategories: new Set()
};

/* ================= MAPA DE CATEGORIAS ================= */
let categoryMap = {}; // { "Fantasia": ["Fantasy", ...] }
let reverseMap = {};  // { "fantasy": "Fantasia" }

async function loadCategoryMap() {
  try {
    const res = await fetch(CATEGORIES_URL);
    if (!res.ok) throw new Error("categories.json não encontrado: " + res.status);
    categoryMap = await res.json();
    rebuildReverseMap();
    // sugestões = SOMENTE chaves em português
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

/* API (inglês) → exibição (português). Retorna null se não mapeada. */
function toDisplayCategory(apiCat) {
  if (!apiCat) return null;
  const key = String(apiCat).toLowerCase().trim();
  if (reverseMap[key]) return reverseMap[key];
  // match parcial: "Fantasy / Epic" → "Fantasia"
  const hit = Object.keys(reverseMap).find(k => key.includes(k));
  return hit ? reverseMap[hit] : null;
}

/* Exibição (português) → lista da API (inglês) para o filtro */
function toApiCategoryList(displayCat) {
  if (!displayCat) return [];
  const trimmed = displayCat.trim();
  const key = Object.keys(categoryMap).find(k => k.toLowerCase() === trimmed.toLowerCase());
  if (key) return categoryMap[key];
  // fallback: usuário digitou algo fora do JSON → usa como está
  return [trimmed];
}

/* ================= util: debounce ================= */
function debounce(fn, wait = 350){
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* ================= fetch helper ================= */
async function fetchBooksRaw(q, params = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", params.maxResults || 20);
  if (params.startIndex) url.searchParams.set("startIndex", params.startIndex);
  if (params.orderBy) url.searchParams.set("orderBy", params.orderBy);
  url.searchParams.set("key", API_KEY);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Erro na API");
  return res.json();
}

/* ================= filtro + normalização ================= */
function filterAndNormalize(items) {
  if (!items) return [];

  const includeApiLists = state.includeCategories.map(toApiCategoryList);
  const excludeApiLists = state.excludeCategories.map(toApiCategoryList);

  const filtered = items.filter(item => {
    const info = item.volumeInfo || {};

    // rating (comparação exata, sem arredondar)
    if (state.rating && ((info.averageRating || 0) < state.rating)) return false;

    // author
    if (state.author) {
      const authors = (info.authors || []).join(" ").toLowerCase();
      if (!authors.includes(state.author.toLowerCase())) return false;
    }

    // year
    if (state.year) {
      const year = info.publishedDate ? info.publishedDate.split("-")[0] : "";
      if (year !== String(state.year)) return false;
    }

    const apiCats = (info.categories || []).map(c => c.toLowerCase());

    // INCLUIR: cada filtro do usuário precisa bater com ≥1 categoria do livro
    if (includeApiLists.length) {
      const allMatch = includeApiLists.every(list =>
        list.some(api => apiCats.some(c => c.includes(api.toLowerCase())))
      );
      if (!allMatch) return false;
    }

    // EXCLUIR: qualquer filtro que bate remove o livro
    if (excludeApiLists.length) {
      const anyExcluded = excludeApiLists.some(list =>
        list.some(api => apiCats.some(c => c.includes(api.toLowerCase())))
      );
      if (anyExcluded) return false;
    }

    return true;
  });

  return filtered.map(item => {
    const info = item.volumeInfo || {};
    // traduz, remove não-mapeadas e duplicatas
    const displayCats = Array.from(new Set(
      (info.categories || []).map(toDisplayCategory).filter(Boolean)
    ));

    return {
      id: item.id || (info.industryIdentifiers?.[0]?.identifier) || "",
      title: info.title || "Sem título",
      authors: info.authors || [],
      year: info.publishedDate ? info.publishedDate.split("-")[0] : "Desconhecido",
      categories: displayCats,
      rating: info.averageRating || 0,
      thumbnail: info.imageLinks?.thumbnail?.replace("http://", "https://") || "",
      description: info.description || ""
    };
  });
}

/* ================= render ================= */
function renderBooks(items) {
  dom.booksContainer.innerHTML = "";
  dom.noResults.hidden = true;
  if (!items.length) {
    dom.noResults.hidden = false;
    return;
  }
  items.forEach(b => {
    const el = document.createElement("article");
    el.className = "book";
    const href = b.id ? `book.html?volumeId=${encodeURIComponent(b.id)}` : "#";
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
function renderStars(rating){
  const r = Math.round(rating);
  return "★".repeat(r) + "☆".repeat(5 - r);
}
function truncate(text, n){ return text ? (text.length > n ? text.slice(0,n) + "..." : text) : "Sem descrição"; }
function escapeHtml(str){ return String(str || "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }

/* ================= UI: lista de categorias ================= */
function renderCategoryLists(){
  dom.includeCategoriesList.innerHTML = "";
  dom.excludeCategoriesList.innerHTML = "";

  state.includeCategories.forEach(cat => {
    const li = document.createElement("li");
    li.innerHTML = `${escapeHtml(cat)} <button aria-label="remover ${escapeHtml(cat)}" data-cat="${escapeHtml(cat)}" data-type="include">✕</button>`;
    dom.includeCategoriesList.appendChild(li);
  });

  state.excludeCategories.forEach(cat => {
    const li = document.createElement("li");
    li.innerHTML = `${escapeHtml(cat)} <button aria-label="remover ${escapeHtml(cat)}" data-cat="${escapeHtml(cat)}" data-type="exclude">✕</button>`;
    dom.excludeCategoriesList.appendChild(li);
  });
}

function addCategory(cat, type = "include"){
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
  performSearch(state.query || dom.searchInput.value || "");
});

/* ================= sugestões ================= */
function showSuggestions(container, items){
  container.innerHTML = "";
  if (!items || !items.length) { container.hidden = true; return; }
  items.slice(0,10).forEach(i => {
    const div = document.createElement("div");
    div.textContent = i;
    div.addEventListener("click", () => {
      if (container === dom.categorySuggestions) addCategory(i, "include");
      else addCategory(i, "exclude");
      container.hidden = true;
      performSearch(state.query || dom.searchInput.value || "");
    });
    container.appendChild(div);
  });
  container.hidden = false;
}

function suggestCategoriesFromInput(inputValue){
  const q = (inputValue || "").toLowerCase().trim();
  const all = Object.keys(categoryMap); // só PT
  if (!q) return all.slice(0, 12);
  return all.filter(c => c.toLowerCase().includes(q)).slice(0, 12);
}

/* ================= rating filter ================= */
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

  performSearch(state.query || dom.searchInput.value || "");
});

/* ================= inputs de categoria ================= */
dom.categorySearch.addEventListener("input", debounce((e) => {
  showSuggestions(dom.categorySuggestions, suggestCategoriesFromInput(e.target.value));
}, 150));

dom.excludeSearch.addEventListener("input", debounce((e) => {
  showSuggestions(dom.excludeSuggestions, suggestCategoriesFromInput(e.target.value));
}, 150));

dom.categorySearch.addEventListener("focus", () => {
  showSuggestions(dom.categorySuggestions, suggestCategoriesFromInput(dom.categorySearch.value));
});
dom.excludeSearch.addEventListener("focus", () => {
  showSuggestions(dom.excludeSuggestions, suggestCategoriesFromInput(dom.excludeSearch.value));
});

dom.addCategoryBtn.addEventListener("click", () => {
  addCategory(dom.categorySearch.value, "include");
  dom.categorySearch.value = "";
  dom.categorySuggestions.hidden = true;
  performSearch(state.query || dom.searchInput.value || "");
});

dom.addExcludeBtn.addEventListener("click", () => {
  addCategory(dom.excludeSearch.value, "exclude");
  dom.excludeSearch.value = "";
  dom.excludeSuggestions.hidden = true;
  performSearch(state.query || dom.searchInput.value || "");
});

/* ================= apply / clear ================= */
dom.applyFiltersBtn.addEventListener("click", () => {
  state.author = dom.authorFilter.value.trim();
  state.year = dom.yearFilter.value ? String(dom.yearFilter.value) : "";
  performSearch(state.query || dom.searchInput.value || "");
});

dom.clearFiltersBtn.addEventListener("click", () => {
  state = { ...state, rating: 0, includeCategories: [], excludeCategories: [], author: "", year: "" };
  dom.authorFilter.value = "";
  dom.yearFilter.value = "";
  dom.categorySearch.value = "";
  dom.excludeSearch.value = "";
  renderCategoryLists();
  dom.ratingFilter.querySelectorAll(".star-btn").forEach(b => {
    b.classList.remove("active");
    b.setAttribute("aria-pressed", "false");
  });
  performSearch("");
});

/* ================= form / live search ================= */
dom.searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = dom.searchInput.value.trim();
  state.query = q;
  performSearch(q);
});

dom.searchInput.addEventListener("input", debounce((e) => {
  const q = e.target.value.trim();
  state.query = q;
  performSearch(q);
}, 450));

/* ================= busca principal ================= */
async function performSearch(query) {
  dom.loading.hidden = false;
  dom.booksContainer.innerHTML = "";
  dom.noResults.hidden = true;
  try {
    let q = query ? `${query}` : "subject:fiction";
    if (state.author) q += `+inauthor:${state.author}`;

    const raw = await fetchBooksRaw(q, { maxResults: 24, orderBy: "relevance" });
    const items = raw.items || [];

    updateTopCategory(items);
    renderBooks(filterAndNormalize(items));
  } catch (err) {
    console.error(err);
    dom.booksContainer.innerHTML = "";
    dom.noResults.hidden = false;
    dom.noResults.textContent = "Erro ao buscar. Tente novamente.";
  } finally {
    dom.loading.hidden = true;
  }
}

/* ================= top category (traduzida) ================= */
function updateTopCategory(items){
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
  dom.topCategoryName.textContent = top;
}

/* ================= initial load ================= */
async function initialLoad(){
  dom.resultsTitle.textContent = "Melhores Avaliados";
  dom.topCategoryName.textContent = "—";
  dom.loading.hidden = false;
  try {
    const res = await fetchBooksRaw("subject:fiction", { maxResults: 30, orderBy: "relevance" });
    const items = res.items || [];
    updateTopCategory(items);

    const sorted = items.slice().sort((a, b) =>
      (b.volumeInfo?.averageRating || 0) - (a.volumeInfo?.averageRating || 0)
    );
    renderBooks(filterAndNormalize(sorted.slice(0, 12)));
  } catch (err) {
    console.error(err);
    dom.noResults.hidden = false;
    dom.noResults.textContent = "Erro ao carregar sugestões.";
  } finally {
    dom.loading.hidden = true;
  }
}

/* ================= top category click ================= */
dom.topCategoryName.addEventListener("click", () => {
  const cat = dom.topCategoryName.textContent;
  if (cat && cat !== "—") {
    dom.searchInput.value = cat;
    state.query = cat;
    performSearch(cat);
  }
});

/* ================= a11y ================= */
[dom.categorySuggestions, dom.excludeSuggestions].forEach(s => {
  s.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const first = s.querySelector("div");
      if (first) first.click();
    }
  });
});

/* ================= START ================= */
(async function init() {
  await loadCategoryMap();  // 1. carrega PT↔EN
  renderCategoryLists();    // 2. listas vazias
  initialLoad();            // 3. busca inicial
})();

window.performSearch = performSearch;
window.state = state;