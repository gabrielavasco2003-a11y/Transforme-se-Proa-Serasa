// ================================================================
// adicionar-livro.js — Adicionar livro por ISBN
// - Busca na Google Books via /api/books/search?q=isbn:XXXX
// - Salva na estante via /api/shelf/add
// ================================================================

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const dom = {
    form:        $('isbn-form'),
    input:       $('isbn-input'),
    searchBtn:   $('isbn-search-btn'),
    resultSec:   $('result-section'),
    resultCard:  $('result-card'),
    statusSel:   $('add-status'),
    addBtn:      $('btn-add-shelf'),
    cancelBtn:   $('btn-cancel'),
    feedback:    $('feedback'),
    emptyState:  $('empty-state')
  };

  let livroAtual = null;   // dados do livro encontrado

  /* ============================================================
     UTILS
     ============================================================ */
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
  }

  function limparIsbn(valor) {
    return String(valor || '').replace(/[^0-9Xx]/g, '');
  }

  function isValidIsbn(isbn) {
    // Aceita 10 ou 13 dígitos
    return isbn.length === 10 || isbn.length === 13;
  }

  function showFeedback(msg, tipo = 'info') {
    dom.feedback.textContent = msg;
    dom.feedback.className = `feedback ${tipo}`;
    dom.feedback.hidden = false;
  }

  function hideFeedback() {
    dom.feedback.hidden = true;
    dom.feedback.textContent = '';
  }

  function showLoading(texto = 'Buscando...') {
    dom.emptyState.hidden = true;
    dom.resultSec.hidden = true;
    showFeedback(texto, 'info');
  }

  /* ============================================================
     BUSCA POR ISBN
     ============================================================ */
  async function buscarPorIsbn(isbn) {
    const url = `/api/books/search?q=isbn:${encodeURIComponent(isbn)}&maxResults=5`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = data.items || [];
    if (!items.length) return null;

    // Se tiver mais de um, pega o primeiro (geralmente o exato)
    const item = items[0];
    const info = item.volumeInfo || {};
    return {
      volumeId: item.id,
      title: info.title || '',
      subtitle: info.subtitle || '',
      authors: info.authors || [],
      description: info.description || '',
      thumbnail: (info.imageLinks?.thumbnail || '').replace('http://', 'https://'),
      publishedDate: info.publishedDate || '',
      categories: info.categories || [],
      industryIdentifiers: info.industryIdentifiers || []
    };
  }

  /* ============================================================
     RENDER DO RESULTADO
     ============================================================ */
  function renderResultado(livro) {
    livroAtual = livro;

    const ano = livro.publishedDate ? livro.publishedDate.split('-')[0] : '';
    const categorias = (livro.categories || []).slice(0, 5).map(c =>
      `<span>${escapeHtml(c)}</span>`
    ).join('');

    const capa = livro.thumbnail
      ? `<img src="${escapeHtml(livro.thumbnail)}" alt="${escapeHtml(livro.title)}" onerror="this.style.opacity=0.3">`
      : `<div style="width:120px;height:180px;background:#f0f0f0;border-radius:6px;flex-shrink:0"></div>`;

    dom.resultCard.innerHTML = `
      ${capa}
      <div class="book-info">
        <h2>${escapeHtml(livro.title)}</h2>
        ${livro.subtitle ? `<p><em>${escapeHtml(livro.subtitle)}</em></p>` : ''}
        <p><strong>Autor(es):</strong> ${escapeHtml(livro.authors.join(', ') || 'Desconhecido')}</p>
        ${ano ? `<p><strong>Ano:</strong> ${escapeHtml(ano)}</p>` : ''}
        ${categorias ? `<div class="book-cats">${categorias}</div>` : ''}
        ${livro.description ? `<p class="book-desc">${escapeHtml(livro.description.slice(0, 240))}${livro.description.length > 240 ? '...' : ''}</p>` : ''}
      </div>
    `;

    dom.resultSec.hidden = false;
    dom.emptyState.hidden = true;
    hideFeedback();
  }

  /* ============================================================
     ADICIONAR À ESTANTE
     ============================================================ */
  async function adicionarAEstante() {
    if (!livroAtual) return;

    const status = dom.statusSel.value;
    dom.addBtn.disabled = true;
    dom.addBtn.textContent = 'Adicionando...';

    try {
      const res = await fetch('/api/shelf/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          volumeId: livroAtual.volumeId,
          status
        })
      });

      const data = await res.json();

      if (res.status === 401) {
        showFeedback('⚠️ Você precisa estar logado para adicionar livros.', 'error');
        setTimeout(() => { window.location.href = '/login.html?redirect=/adicionar-livro'; }, 1500);
        return;
      }

      if (!res.ok) {
        throw new Error(data?.mensagem || `HTTP ${res.status}`);
      }

      showFeedback(`✅ "${livroAtual.title}" foi adicionado à sua estante!`, 'success');
      dom.resultSec.hidden = true;
      dom.emptyState.hidden = false;
      livroAtual = null;

      setTimeout(() => { window.location.href = '/shelf.html'; }, 1800);
    } catch (err) {
      console.error(err);
      showFeedback('❌ Erro ao adicionar: ' + err.message, 'error');
    } finally {
      dom.addBtn.disabled = false;
      dom.addBtn.textContent = 'Adicionar à Estante';
    }
  }

  /* ============================================================
     EVENTOS
     ============================================================ */
  function bindEvents() {
    dom.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideFeedback();
      dom.resultSec.hidden = true;

      const isbnRaw = dom.input.value;
      const isbn = limparIsbn(isbnRaw);

      if (!isbn) {
        showFeedback('Digite um ISBN para buscar.', 'error');
        return;
      }
      if (!isValidIsbn(isbn)) {
        showFeedback('ISBN inválido. Digite 10 ou 13 dígitos.', 'error');
        return;
      }

      showLoading('🔍 Buscando ISBN ' + isbn + '...');
      dom.searchBtn.disabled = true;
      dom.searchBtn.textContent = 'Buscando...';

      try {
        const livro = await buscarPorIsbn(isbn);
        if (!livro) {
          showFeedback(
            `😕 Nenhum livro encontrado com o ISBN ${isbn}. Confira o número ou busque pelo título em "Busca".`,
            'error'
          );
          dom.emptyState.hidden = false;
          return;
        }
        renderResultado(livro);
      } catch (err) {
        console.error(err);
        showFeedback('❌ Erro ao buscar: ' + err.message, 'error');
        dom.emptyState.hidden = false;
      } finally {
        dom.searchBtn.disabled = false;
        dom.searchBtn.textContent = '🔍 Buscar';
      }
    });

    dom.addBtn.addEventListener('click', adicionarAEstante);

    dom.cancelBtn.addEventListener('click', () => {
      dom.resultSec.hidden = true;
      dom.emptyState.hidden = false;
      dom.input.value = '';
      dom.input.focus();
      livroAtual = null;
      hideFeedback();
    });
  }

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();