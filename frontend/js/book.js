// book.js — detalhe do livro (via proxy do backend)
// Não usa mais chave do Google no front.

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
    // 1) Busca o livro pelo backend (proxy + cache no MongoDB)
    const res = await fetch(`/api/book/${encodeURIComponent(volumeId)}`);
    if (!res.ok) throw new Error('Livro não encontrado');
    const data = await res.json();
    const book = data.book || {};

    // 2) Preenche a página
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

    // 3) Estado do usuário
    const user = await getUser();

    // 4) Avaliação (média da comunidade + minha nota)
    await loadRating(volumeId, !!user);

    // 5) Estante / status
    if (user) {
      await setupShelfControls(volumeId, user);
      document.getElementById('comment-box').hidden = false;
      setupComments(volumeId, user);
    } else {
      // Visitante: mostra apenas comentários, sem caixa de envio
      setupComments(volumeId, null);
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Erro ao carregar o livro. Tente novamente.</p>';
  }
}

/* ========== AVALIAÇÃO ========== */
async function loadRating(volumeId, isLogged) {
  try {
    const res = await fetch(`/api/book/${encodeURIComponent(volumeId)}/rating`);
    if (!res.ok) throw new Error('Erro ao buscar nota');
    const data = await res.json();

    const communityEl = document.getElementById('community-rating');
    if (data.media != null) {
      communityEl.textContent = `${data.media} / 10 (${data.total} avaliação${data.total === 1 ? '' : 'ões'})`;
    } else {
      communityEl.textContent = 'Sem avaliações ainda';
    }

    const box = document.getElementById('rating-box');
    const slider = document.getElementById('user-rating');
    const output = document.getElementById('user-rating-value');

    if (!isLogged) {
      box.hidden = true;
      return;
    }

    box.hidden = false;
    const minha = data.minhaNota != null ? data.minhaNota : 0;
    slider.value = minha;
    output.textContent = minha;

    slider.oninput = () => { output.textContent = slider.value; };
    slider.onchange = async () => {
      await saveRating(volumeId, Number(slider.value));
    };

    document.getElementById('clear-rating').onclick = async () => {
      await saveRating(volumeId, null);
    };
  } catch (e) {
    console.warn('Avaliação indisponível:', e);
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
    slider.value = data.minhaNota != null ? data.minhaNota : 0;
    output.textContent = slider.value;
  } catch (e) {
    console.error(e);
    alert(e.message);
  }
}

/* ========== ESTANTE / STATUS (chamada única) ========== */
async function setupShelfControls(volumeId, user) {
  const picker = document.getElementById('status-picker');
  const buttons = picker.querySelectorAll('.status-btn');

  // Descobre se o livro já está na estante (e qual status)
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

  const marcarAtivo = (status) => {
    buttons.forEach(b => b.classList.toggle('active', b.dataset.status === status));
  };
  if (item?.status) marcarAtivo(item.status);

  // Desabilita os botões durante o request (evita duplo clique)
  const setDisabled = (disabled) => {
    buttons.forEach(b => { b.disabled = disabled; });
  };

  buttons.forEach(btn => {
    btn.onclick = async () => {
      const status = btn.dataset.status;

      // Se já está nesse status, não faz nada
      if (item?.status === status) return;

      setDisabled(true);
      try {
        // Uma única chamada: o backend cria OU atualiza
        const res = await fetch('/api/shelf/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ volumeId, status })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensagem || 'Erro ao salvar status');

        item = data.item || { volumeId, status };
        marcarAtivo(status);
        btn.blur();
      } catch (e) {
        console.error(e);
        alert(e.message);
      } finally {
        setDisabled(false);
      }
    };
  });
}

/* ========== COMENTÁRIOS ========== */
async function setupComments(volumeId, user) {
  const list = document.getElementById('comments-list');

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