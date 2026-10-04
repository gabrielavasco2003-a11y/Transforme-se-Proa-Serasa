// book.js — detalhe do livro (via proxy do backend)
// Prioriza dados locais (MongoDB) quando existirem; senão, usa API Google via backend.

const REACTION_LABELS = {
  amei: '😍 Amei',
  quero_mais: '⭐ Quero mais',
  ok: '😐 É ok',
  chorei: '😭 Chorei',
  curti: '👍 Curti',
  fraco: '😕 Fraco',
  engracado: '😂 Engraçado',
  muito_ruim: '👎 Muito ruim',
  favorito: '❤️ Favorito',
  recomendo: '🔥 Recomendo',
  confuso: '🤔 Confuso',
  abandonei: '🗑️ Abandonei'
};

async function getUser() {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (res.ok) return res.json();
  } catch (_) { /* sem backend */ }
  return null;
}

function getVolumeIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('volumeId');
}

async function loadBook() {
  const volumeId = getVolumeIdFromUrl();
  const container = document.getElementById('book-detail');

  if (!volumeId) {
    container.innerHTML = '<p>Livro não encontrado (volumeId ausente).</p>';
    return;
  }

  try {
    const res = await fetch(`/api/book/${encodeURIComponent(volumeId)}`);
    if (!res.ok) throw new Error('Livro não encontrado');
    const data = await res.json();
    const book = data.book || {};

    document.getElementById('book-title').textContent = book.title || 'Sem título';
    document.getElementById('book-authors').textContent =
      (book.authors || []).join(', ') || 'Desconhecido';
    document.getElementById('book-year').textContent =
      book.publishedDate ? String(book.publishedDate).split('-')[0] : 'Desconhecido';
    document.getElementById('book-categories').textContent =
      (book.categories || []).join(', ') || '—';
    document.getElementById('book-description').textContent =
      book.description || 'Sem descrição';

    const thumb = document.getElementById('book-thumbnail');
    if (book.thumbnail) {
      thumb.src = book.thumbnail.replace('http://', 'https://');
      thumb.alt = book.title || 'Capa do livro';
    } else {
      thumb.alt = 'Sem capa';
      thumb.style.display = 'none';
    }

    const user = await getUser();

    // Avaliação (média + minha nota)
    await loadRating(volumeId, !!user);

    if (user) {
      // Mostra seções extras (progresso, reação, nota)
      document.getElementById('user-extras').hidden = false;
      document.getElementById('comment-box').hidden = false;

      // Carrega dados da estante (status, reação, progresso) + liga controles
      await setupShelfControls(volumeId, user);

      setupComments(volumeId, user);
    } else {
      document.getElementById('user-extras').hidden = true;
      document.getElementById('comment-box').hidden = true;
      setupComments(volumeId, null);
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Erro ao carregar o livro. Tente novamente.</p>';
  }
}

/* ========== AVALIAÇÃO ========== */
async function loadRating(volumeId, isLogged) {
  const communityEl = document.getElementById('community-rating');
  const slider = document.getElementById('user-rating');
  const output = document.getElementById('user-rating-value');

  try {
    const res = await fetch(`/api/book/${encodeURIComponent(volumeId)}/rating`, {
      credentials: 'same-origin'
    });
    if (!res.ok) throw new Error('Erro ao buscar nota');
    const data = await res.json();

    if (data.media != null) {
      communityEl.textContent = `${data.media} / 10 (${data.total} avaliação${data.total === 1 ? '' : 'ões'})`;
    } else {
      communityEl.textContent = 'Sem avaliações ainda';
    }

    if (!isLogged) return;

    const minha = data.minhaNota != null ? Number(data.minhaNota) : 0;
    slider.value = minha;
    output.textContent = data.minhaNota != null ? minha : '—';

    slider.oninput = () => {
      output.textContent = slider.value;
    };

    slider.onchange = async () => {
      await saveRating(volumeId, Number(slider.value));
    };

    document.getElementById('clear-rating').onclick = async () => {
      await saveRating(volumeId, null);
    };
  } catch (e) {
    console.warn('Avaliação indisponível:', e);
    communityEl.textContent = '—';
  }
}

async function saveRating(volumeId, value) {
  try {
    const res = await fetch(`/api/book/${encodeURIComponent(volumeId)}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensagem || 'Erro ao salvar nota');

    const communityEl = document.getElementById('community-rating');
    if (data.media != null) {
      communityEl.textContent = `${data.media} / 10 (${data.total} avaliação${data.total === 1 ? '' : 'ões'})`;
    } else {
      communityEl.textContent = 'Sem avaliações ainda';
    }

    const slider = document.getElementById('user-rating');
    const output = document.getElementById('user-rating-value');
    if (data.minhaNota != null) {
      slider.value = data.minhaNota;
      output.textContent = data.minhaNota;
    } else {
      slider.value = 0;
      output.textContent = '—';
    }
  } catch (e) {
    console.error(e);
    alert(e.message);
  }
}

/* ========== ESTANTE / STATUS / REAÇÃO / PROGRESSO ========== */
async function setupShelfControls(volumeId, user) {
  const picker = document.getElementById('status-picker');
  const buttons = picker.querySelectorAll('.status-btn');
  const reactionBtns = document.querySelectorAll('.reaction-btn');
  const pageInput = document.getElementById('current-page');
  const chapterInput = document.getElementById('current-chapter');

  // Busca o item da estante (se existir)
  let item = null;
  try {
    const res = await fetch(`/api/shelf/item/${encodeURIComponent(volumeId)}`, {
      credentials: 'same-origin'
    });
    if (res.ok) {
      const data = await res.json();
      item = data.item || null;
    }
  } catch (_) { /* ignora */ }

  const marcarStatus = (status) => {
    buttons.forEach(b => {
      const on = b.dataset.status === status;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  const marcarReacao = (reaction) => {
    reactionBtns.forEach(b => {
      const on = b.dataset.reaction === reaction;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  // Preenche com o que já existe
  if (item) {
    if (item.status) marcarStatus(item.status);
    if (item.reaction) marcarReacao(item.reaction);
    if (item.currentPage != null) pageInput.value = item.currentPage;
    if (item.chapter) chapterInput.value = item.chapter;
  }

  const setDisabled = (disabled) => {
    buttons.forEach(b => { b.disabled = disabled; });
    reactionBtns.forEach(b => { b.disabled = disabled; });
  };

  // Salva no backend (cria ou atualiza)
  async function salvarShelf(patch) {
    setDisabled(true);
    try {
      const res = await fetch('/api/shelf/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ volumeId, ...patch })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensagem || 'Erro ao salvar');
      item = data.item || { ...(item || {}), volumeId, ...patch };
      return item;
    } finally {
      setDisabled(false);
    }
  }

  // Status
  buttons.forEach(btn => {
    btn.onclick = async () => {
      const status = btn.dataset.status;
      if (item?.status === status) return;
      try {
        await salvarShelf({ status });
        marcarStatus(status);
        btn.blur();
      } catch (e) { console.error(e); alert(e.message); }
    };
  });

  // Reação (toggle: se clicar na mesma, remove)
  reactionBtns.forEach(btn => {
    btn.onclick = async () => {
      const reaction = btn.dataset.reaction;
      const nova = item?.reaction === reaction ? null : reaction;
      try {
        await salvarShelf({ reaction: nova });
        marcarReacao(nova);
        btn.blur();
      } catch (e) { console.error(e); alert(e.message); }
    };
  });

  // Progresso — salva ao sair do campo (blur) para evitar request a cada tecla
  const salvarProgresso = async () => {
    const currentPage = pageInput.value === '' ? null : Number(pageInput.value);
    const chapter = chapterInput.value.trim() || null;
    try {
      await salvarShelf({ currentPage, chapter });
    } catch (e) { console.error(e); alert(e.message); }
  };
  pageInput.onblur = salvarProgresso;
  chapterInput.onblur = salvarProgresso;
}

/* ========== COMENTÁRIOS ========== */
async function setupComments(volumeId, user) {
  const list = document.getElementById('comments-list');
  if (!list) return;

  async function loadComments() {
    try {
      const res = await fetch(`/api/book/${encodeURIComponent(volumeId)}/comments`);
      const data = await res.json();
      list.innerHTML = '';
      (data.comments || []).forEach(c => {
        const li = document.createElement('li');

        const header = document.createElement('div');
        header.className = 'comment-meta';
        const nome = c.userId?.usuario || c.userId?.nome || 'Anônimo';
        header.textContent = `${nome} • ${new Date(c.createdAt).toLocaleString('pt-BR')}`;

        const body = document.createElement('p');
        body.textContent = c.text;

        li.appendChild(header);
        li.appendChild(body);

        if (user && c.userId && String(c.userId._id) === String(user._id)) {
          const actions = document.createElement('div');
          actions.className = 'comment-actions';
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.textContent = 'Excluir';
          delBtn.onclick = async () => {
            if (!confirm('Excluir este comentário?')) return;
            const r = await fetch(`/api/book/${encodeURIComponent(volumeId)}/comment/${c._id}`, {
              method: 'DELETE',
              credentials: 'same-origin'
            });
            if (r.ok) loadComments();
            else alert('Erro ao excluir.');
          };
          actions.appendChild(delBtn);
          li.appendChild(actions);
        }
        list.appendChild(li);
      });
    } catch (e) {
      console.warn('Comentários indisponíveis:', e);
    }
  }

  const submit = document.getElementById('submit-comment');
  if (submit) {
    submit.onclick = async () => {
      const textEl = document.getElementById('comment-text');
      const text = textEl.value.trim();
      if (!text) return;
      try {
        const res = await fetch(`/api/book/${encodeURIComponent(volumeId)}/comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (res.ok) {
          textEl.value = '';
          loadComments();
        } else {
          alert(data.mensagem || 'Erro ao comentar.');
        }
      } catch (e) {
        alert('Backend de comentários indisponível.');
      }
    };
  }

  loadComments();
}

loadBook();