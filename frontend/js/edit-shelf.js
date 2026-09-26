// ============================================
// EDIT-SHELF — Editar livro da estante
// ============================================
let bookData = null;
let shelfItem = {
  status: "",
  currentPage: null,
  currentChapter: "",
  reactions: [],
  userRating: null
};

// ---- Helpers ----
function getVolumeIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("volumeId");
}

function mostrarOffline() {
  const banner = document.getElementById("offline-banner");
  if (banner) banner.hidden = navigator.onLine;
}
window.addEventListener('online',  mostrarOffline);
window.addEventListener('offline', mostrarOffline);

// ---- Fetches ----
async function carregarLivro(volumeId) {
  const res = await fetch(`/api/book/${encodeURIComponent(volumeId)}`);
  if (!res.ok) throw new Error("Livro não encontrado");
  const data = await res.json();
  return data.book;
}

async function carregarItemEstante(volumeId) {
  const res = await fetch(`/api/shelf/item/${encodeURIComponent(volumeId)}`);
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const data = await res.json();
  return data.item;
}

async function carregarReacoes() {
  const res = await fetch('/api/reactions');
  if (!res.ok) return [];
  return res.json();
}

// ---- Render ----
function renderBookHeader(book) {
  document.getElementById("edit-cover").src = book.thumbnail || "/img/placeholder.png";
  document.getElementById("edit-title").textContent = book.title || "Sem título";
  document.getElementById("edit-authors").textContent = (book.authors || []).join(", ") || "Autor desconhecido";
  document.getElementById("edit-meta").textContent = book.publishedDate || "Ano não informado";
  
  const tagsDiv = document.getElementById("edit-tags");
  tagsDiv.innerHTML = "";
  (book.categories || []).forEach(c => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = c;
    tagsDiv.appendChild(span);
  });
  
  document.getElementById("edit-description").textContent = book.description || "Sem descrição disponível.";
}

function renderReacoes(reacoes) {
  const grid = document.getElementById("reactions-grid");
  grid.innerHTML = "";
  reacoes.forEach(r => {
    const chip = document.createElement("button");
    chip.className = "reaction-chip";
    chip.type = "button";
    chip.dataset.reaction = r.id;
    chip.textContent = `${r.emoji} ${r.label}`;
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      if (chip.classList.contains("active")) {
        if (!shelfItem.reactions.includes(r.id)) shelfItem.reactions.push(r.id);
      } else {
        shelfItem.reactions = shelfItem.reactions.filter(x => x !== r.id);
      }
    });
    grid.appendChild(chip);
  });
}

function renderShelfItem(item) {
  if (item.status) {
    const btn = document.querySelector(`.status-btn[data-status="${item.status}"]`);
    if (btn) btn.classList.add("active");
    shelfItem.status = item.status;
    document.getElementById("progress-block").hidden = (item.status !== "lendo");
  }
  document.getElementById("current-page").value = item.currentPage ?? "";
  document.getElementById("current-chapter").value = item.currentChapter || "";
  
  shelfItem.reactions = item.reactions || [];
  document.querySelectorAll(".reaction-chip").forEach(chip => {
    if (shelfItem.reactions.includes(chip.dataset.reaction)) chip.classList.add("active");
  });
  
  if (item.userRating !== null && item.userRating !== undefined) {
    document.getElementById("note-slider").value = item.userRating;
    document.getElementById("note-value").value = item.userRating;
    shelfItem.userRating = item.userRating;
  }
}

// ---- Eventos ----
function setupEventos() {
  // Status
  document.querySelectorAll(".status-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".status-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      shelfItem.status = btn.dataset.status;
      document.getElementById("progress-block").hidden = (shelfItem.status !== "lendo");
    });
  });

  // Nota
  const noteSlider = document.getElementById("note-slider");
  const noteValue = document.getElementById("note-value");
  noteSlider.addEventListener("input", () => {
    noteValue.value = parseInt(noteSlider.value, 10);
  });
  noteValue.addEventListener("input", () => {
    let v = parseInt(noteValue.value, 10);
    if (isNaN(v)) v = 0;
    if (v < 0) v = 0;
    if (v > 10) v = 10;
    noteSlider.value = v;
  });
  noteValue.addEventListener("blur", () => {
    let v = parseInt(noteValue.value, 10);
    if (isNaN(v)) v = 0;
    v = Math.max(0, Math.min(10, v));
    noteValue.value = v;
    noteSlider.value = v;
    shelfItem.userRating = v;
  });
  noteSlider.addEventListener("change", () => {
    shelfItem.userRating = parseInt(noteSlider.value, 10);
  });

  document.getElementById("remove-note").addEventListener("click", () => {
    noteSlider.value = 0;
    noteValue.value = 0;
    shelfItem.userRating = null;
  });

  // Salvar
  document.getElementById("save-btn").addEventListener("click", async () => {
    if (!shelfItem.status) {
      alert("Por favor, selecione um status antes de salvar.");
      return;
    }
    if (!navigator.onLine) {
      alert("Você está offline. Não é possível salvar agora.");
      return;
    }
    const payload = {
      volumeId: bookData.volumeId,
      status: shelfItem.status,
      currentPage: shelfItem.status === "lendo" ? (parseInt(document.getElementById("current-page").value, 10) || null) : null,
      currentChapter: shelfItem.status === "lendo" ? (document.getElementById("current-chapter").value || "") : "",
      reactions: shelfItem.reactions,
      userRating: shelfItem.userRating
    };
    try {
      const res = await fetch('/api/shelf/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        alert("Alterações salvas!");
        window.location.href = "/shelf.html";
      } else {
        alert(data.mensagem || "Erro ao salvar.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão.");
    }
  });

  // Cancelar
  document.getElementById("cancel-btn").addEventListener("click", () => {
    if (confirm("Descartar alterações?")) window.location.href = "/shelf.html";
  });

  // Remover
  document.getElementById("delete-btn").addEventListener("click", async () => {
    if (!confirm("Tem certeza que deseja remover este livro da sua estante?")) return;
    if (!navigator.onLine) {
      alert("Você está offline. Não é possível remover agora.");
      return;
    }
    try {
      const res = await fetch('/api/shelf/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volumeId: bookData.volumeId })
      });
      if (res.ok) window.location.href = "/shelf.html";
      else alert("Erro ao remover.");
    } catch (e) {
      console.error(e);
      alert("Erro de conexão.");
    }
  });

  // Dropdown
  document.getElementById("avatar").addEventListener("click", () => {
    document.getElementById("dropdown").classList.toggle("hidden");
  });
}

// ---- Init ----
(async function init() {
  mostrarOffline();
  const volumeId = getVolumeIdFromUrl();
  if (!volumeId) {
    alert("Nenhum livro especificado.");
    window.location.href = "/shelf.html";
    return;
  }

  try {
    const meRes = await fetch('/api/me');
    if (!meRes.ok) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login.html?next=${next}`;
      return;
    }

    bookData = await carregarLivro(volumeId);
    renderBookHeader(bookData);

    const reacoes = await carregarReacoes();
    renderReacoes(reacoes);

    const item = await carregarItemEstante(volumeId);
    if (item) {
      shelfItem = { ...shelfItem, ...item };
      renderShelfItem(shelfItem);
    }

    setupEventos();
  } catch (e) {
    console.error(e);
    alert("Erro ao carregar o livro. Verifique sua conexão.");
    window.location.href = "/shelf.html";
  }
})();