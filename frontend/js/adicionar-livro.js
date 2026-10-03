// ================================================================
// adicionar-livro.js — Adicionar livro por ISBN
// - Busca na Google Books via /api/books/search
// - Se não achar → abre formulário manual
// - Salva no banco (/api/shelf/add-manual)
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
    emptyState:  $('empty-state'),

    // Manual
    manualSec:   $('manual-section'),
    manualForm:  $('manual-form'),
    manualIsbn:  $('manual-isbn'),
    manualTitle: $('manual-title'),
    manualAuthor:$('manual-author'),
    manualYear:  $('manual-year'),
    manualGenre: $('manual-genre'),
    manualCover: $('manual-cover'),
    manualDesc:  $('manual-desc'),
    manualStatus:$('manual-status'),
    manualCancel:$('btn-manual-cancel'),
    manualSave:  $('btn-manual-save'),
    manualErrors:$('manual-errors')
  };

  let livroAtual = null;
  let isbnBuscado = null;

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
    return isbn.length === 10 || isbn.length === 13;
  }

  function showFeedback(msg, tipo = 'info') {
    dom.feedback.textContent = msg;
    dom.feedback.className = `feedback ${tipo}`;
    dom.feedback.hidden = false;
    dom.feedback.classList.remove('hidden');
    dom.feedback.style.display = 'block';
  }

  function hideFeedback() {
    dom.feedback.hidden = true;
    dom.feedback.classList.add('hidden');
    dom.feedback.style.display = 'none';
    dom.feedback.textContent = '';
  }

  /* ============================================================
     MOSTRAR / ESCONDER SEÇÕES
     ============================================================ */
  function mostrar(el, display = 'block') {
    if (!el) return;
    el.hidden = false;
    el.classList.remove('hidden');
    el.style.display = display;
  }

  function esconder(el) {
    if (!el) return;
    el.hidden = true;
    el.classList.add('hidden');
    el.style.display = 'none';
  }

  function showLoading(texto = 'Buscando...') {
    esconder(dom.emptyState);
    esconder(dom.resultSec);
    esconder(dom.manualSec);
    showFeedback(texto, 'info');
  }

  function hideAll() {
    esconder(dom.resultSec);
    esconder(dom.manualSec);
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
     RENDER — Resultado da API
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

    mostrar(dom.resultSec, 'flex');
    esconder(dom.emptyState);
    esconder(dom.manualSec);
    hideFeedback();
  }

  /* ============================================================
     RENDER — Formulário manual
     ============================================================ */
  function renderManual(isbn) {
    isbnBuscado = isbn;
    livroAtual = null;

    dom.manualIsbn.value = isbn;
    dom.manualTitle.value = '';
    dom.manualAuthor.value = '';
    dom.manualYear.value = '';
    dom.manualGenre.value = '';
    dom.manualCover.value = '';
    dom.manualDesc.value = '';
    dom.manualStatus.value = 'quero';
    dom.manualErrors.innerHTML = '';
    dom.manualErrors.hidden = true;

    // 🔥 AQUI ESTAVA O BUG — agora força:
    mostrar(dom.manualSec, 'block');
    esconder(dom.resultSec);
    esconder(dom.emptyState);
    hideFeedback();

    setTimeout(() => dom.manualTitle.focus(), 100);
  }

  /* ============================================================
     VALIDAÇÃO DO FORMULÁRIO MANUAL
     ============================================================ */
  function validarManual() {
    const erros = [];

    const titulo = dom.manualTitle.value.trim();
    const autor = dom.manualAuthor.value.trim();
    const ano = dom.manualYear.value.trim();
    const genero = dom.manualGenre.value.trim();

    if (!titulo || titulo.length < 2) {
      erros.push('O título é obrigatório (mínimo 2 caracteres).');
    }
    if (!autor || autor.length < 2) {
      erros.push('O autor é obrigatório (mínimo 2 caracteres).');
    }
    if (!ano) {
      erros.push('O ano de publicação é obrigatório.');
    } else {
      const n = parseInt(ano, 10);
      const anoAtual = new Date().getFullYear();
      if (isNaN(n) || n < 1400 || n > anoAtual + 1) {
        erros.push(`O ano deve ser entre 1400 e ${anoAtual + 1}.`);
      }
    }
    if (!genero || genero.length < 2) {
      erros.push('O gênero é obrigatório.');
    }

    return erros;
  }

  /* ============================================================
     ADICIONAR — via API (livro encontrado)
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
        body: JSON.stringify({ volumeId: livroAtual.volumeId, status })
      });

      const data = await res.json();

      if (res.status === 401) {
        showFeedback('⚠️ Você precisa estar logado.', 'error');
        setTimeout(() => { window.location.href = '/login.html?redirect=/adicionar-livro'; }, 1500);
        return;
      }
      if (!res.ok) throw new Error(data?.mensagem || `HTTP ${res.status}`);

      showFeedback(`✅ "${livroAtual.title}" foi adicionado à sua estante!`, 'success');
      hideAll();
      mostrar(dom.emptyState, 'block');
      setTimeout(() => { window.location.href = '/shelf.html'; }, 1500);
    } catch (err) {
      console.error(err);
      showFeedback('❌ Erro ao adicionar: ' + err.message, 'error');
    } finally {
      dom.addBtn.disabled = false;
      dom.addBtn.textContent = 'Adicionar à Estante';
    }
  }

  /* ============================================================
     ADICIONAR — manual (livro não encontrado)
     ============================================================ */
  async function adicionarManual() {
    const erros = validarManual();

    if (erros.length) {
      dom.manualErrors.innerHTML = erros.map(e => `<li>${escapeHtml(e)}</li>`).join('');
      dom.manualErrors.hidden = false;
      dom.manualErrors.classList.remove('hidden');
      dom.manualErrors.style.display = 'block';
      dom.manualErrors.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    dom.manualErrors.hidden = true;
    dom.manualErrors.classList.add('hidden');
    dom.manualSave.disabled = true;
    dom.manualSave.textContent = 'Salvando...';

    const payload = {
      isbn: isbnBuscado,
      title: dom.manualTitle.value.trim(),
      authors: dom.manualAuthor.value.trim().split(',').map(a => a.trim()).filter(Boolean),
      publishedDate: dom.manualYear.value.trim(),
      categories: dom.manualGenre.value.trim().split(',').map(g => g.trim()).filter(Boolean),
      thumbnail: dom.manualCover.value.trim(),
      description: dom.manualDesc.value.trim(),
      status: dom.manualStatus.value
    };

    try {
      const res = await fetch('/api/shelf/add-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 401) {
        showFeedback('⚠️ Você precisa estar logado.', 'error');
        setTimeout(() => { window.location.href = '/login.html?redirect=/adicionar-livro'; }, 1500);
        return;
      }
      if (!res.ok) throw new Error(data?.mensagem || `HTTP ${res.status}`);

      showFeedback(`✅ "${payload.title}" foi adicionado à sua estante!`, 'success');
      hideAll();
      mostrar(dom.emptyState, 'block');
      setTimeout(() => { window.location.href = '/shelf.html'; }, 1500);
    } catch (err) {
      console.error(err);
      showFeedback('❌ Erro ao salvar: ' + err.message, 'error');
    } finally {
      dom.manualSave.disabled = false;
      dom.manualSave.textContent = 'Salvar na Estante';
    }
  }

  /* ============================================================
     EVENTOS
     ============================================================ */
  function bindEvents() {
    dom.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideFeedback();
      hideAll();

      const isbn = limparIsbn(dom.input.value);

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
            `😕 Nenhum livro encontrado com o ISBN ${isbn}. Preencha os dados manualmente abaixo.`,
            'error'
          );
          renderManual(isbn);
          return;
        }
        renderResultado(livro);
      } catch (err) {
        console.error(err);
        showFeedback('❌ Erro ao buscar: ' + err.message, 'error');
        mostrar(dom.emptyState, 'block');
      } finally {
        dom.searchBtn.disabled = false;
        dom.searchBtn.textContent = '🔍 Buscar';
      }
    });

    dom.addBtn.addEventListener('click', adicionarAEstante);

    dom.cancelBtn.addEventListener('click', () => {
      hideAll();
      dom.input.value = '';
      dom.input.focus();
      livroAtual = null;
      hideFeedback();
      mostrar(dom.emptyState, 'block');
    });

    dom.manualForm.addEventListener('submit', (e) => {
      e.preventDefault();
      adicionarManual();
    });

    dom.manualCancel.addEventListener('click', () => {
      hideAll();
      dom.input.value = '';
      dom.input.focus();
      isbnBuscado = null;
      hideFeedback();
      mostrar(dom.emptyState, 'block');
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