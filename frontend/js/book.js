// book.js - detalhe do livro (Google Books API)
const API_KEY = "AIzaSyAu6edO3YMiflVEFdkxbZBRA9ECY-Nt31o";
const API_BASE = "https://www.googleapis.com/books/v1/volumes";

async function getUser() {
  // Backend opcional — se não existir, retorna null sem quebrar
  try {
    const res = await fetch("/api/me");
    if (res.ok) return res.json();
  } catch (_) { /* sem backend, ignora */ }
  return null;
}

async function loadBook() {
  const params = new URLSearchParams(window.location.search);
  const volumeId = params.get("volumeId");
  const container = document.getElementById("book-detail");

  if (!volumeId) {
    container.innerHTML = "<p>Livro não encontrado (volumeId ausente).</p>";
    return;
  }

  try {
    // Busca direto na Google Books API
    const res = await fetch(`${API_BASE}/${encodeURIComponent(volumeId)}?key=${API_KEY}`);
    if (!res.ok) throw new Error("Erro na API do Google Books");

    const item = await res.json();
    const info = item.volumeInfo || {};

    // Normaliza (mesmos campos do busca.js)
    const book = {
      id: item.id || volumeId,
      title: info.title || "Sem título",
      authors: info.authors || [],
      year: info.publishedDate ? info.publishedDate.split("-")[0] : "Desconhecido",
      categories: info.categories || [],
      rating: info.averageRating || 0,
      thumbnail: info.imageLinks?.thumbnail?.replace("http://", "https://") || "",
      description: info.description || "Sem descrição"
    };

    // Preenche a página
    document.getElementById("book-title").textContent = book.title;
    document.getElementById("book-authors").textContent = book.authors.join(", ") || "Desconhecido";
    document.getElementById("book-year").textContent = book.year;
    document.getElementById("book-categories").textContent = book.categories.join(", ") || "—";
    document.getElementById("book-description").textContent = book.description;

    const thumb = document.getElementById("book-thumbnail");
    if (book.thumbnail) {
      thumb.src = book.thumbnail;
    } else {
      thumb.alt = "Sem capa";
      thumb.style.display = "none";
    }

    // Estante / comentários (só funcionam se houver backend)
    const addBtn = document.getElementById("add-to-shelf");
    const user = await getUser();

    if (user) {
      addBtn.onclick = async () => {
        try {
          const r = await fetch("/api/shelf/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ volumeId })
          });
          const d = await r.json();
          alert(d.mensagem || "Adicionado!");
        } catch (e) {
          alert("Não foi possível adicionar (backend indisponível).");
        }
      };

      document.getElementById("comment-box").hidden = false;
      setupComments(volumeId, user);
    } else {
      addBtn.onclick = () => alert("Faça login para adicionar à estante.");
    }

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Erro ao carregar o livro. Tente novamente.</p>";
  }
}

async function setupComments(volumeId, user) {
  async function loadComments() {
    try {
      const res = await fetch(`/api/book/${volumeId}/comments`);
      const data = await res.json();
      const list = document.getElementById("comments-list");
      list.innerHTML = "";
      (data.comments || []).forEach(c => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${c.userId?.usuario || c.userId?.nome || "Anônimo"}</strong> - ${new Date(c.createdAt).toLocaleDateString()}<br>${c.text}`;
        if (user && user._id === c.userId?._id) {
          const delBtn = document.createElement("button");
          delBtn.textContent = "Excluir";
          delBtn.onclick = async () => {
            await fetch(`/api/book/${volumeId}/comment/${c._id}`, { method: "DELETE" });
            loadComments();
          };
          li.appendChild(delBtn);
        }
        list.appendChild(li);
      });
    } catch (e) {
      console.warn("Comentários indisponíveis:", e);
    }
  }

  document.getElementById("submit-comment").onclick = async () => {
    const text = document.getElementById("comment-text").value.trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/book/${volumeId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (res.ok) {
        document.getElementById("comment-text").value = "";
        loadComments();
      } else {
        alert(data.mensagem || "Erro ao comentar.");
      }
    } catch (e) {
      alert("Backend de comentários indisponível.");
    }
  };

  loadComments();
}

loadBook();