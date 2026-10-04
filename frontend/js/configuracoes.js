// ================================================================
// configuracoes.js — Lógica da página de configurações
// ================================================================

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const DEFAULT_PREFS = {
    theme: 'auto',
    fontSize: 'medium',
    language: 'pt-BR',
    dateFormat: 'DD/MM/YYYY'
  };

  let prefs = { ...DEFAULT_PREFS };

  /* ============================================================
     FEEDBACK
     ============================================================ */
  function showFeedback(msg, tipo = 'success') {
    const el = $('config-feedback');
    el.textContent = msg;
    el.className = `config-feedback ${tipo}`;
    el.hidden = false;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.hidden = true; }, 3500);
  }

  /* ============================================================
     CARREGAR PREFERÊNCIAS
     ============================================================ */
  async function carregarPreferencias() {
    // Tema e fonte: localStorage (via theme.js)
    prefs.theme    = window.Theme?.get?.() || 'auto';
    prefs.fontSize = window.Theme?.getFont?.() || 'medium';

    // Resto: backend (se logado)
    try {
      const res = await fetch('/api/config', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        const cfg = data.config || {};
        if (cfg.language)    prefs.language = cfg.language;
        if (cfg.dateFormat)  prefs.dateFormat = cfg.dateFormat;
      }
    } catch (err) {
      console.warn('Erro ao carregar preferências:', err);
    }

    renderizarFormulario();
  }

  function renderizarFormulario() {
    // Tema
    document.querySelectorAll('.theme-btn').forEach(btn => {
      const ativo = btn.dataset.theme === prefs.theme;
      btn.classList.toggle('active', ativo);
      btn.setAttribute('aria-checked', ativo ? 'true' : 'false');
    });

    // Fonte
    if ($('pref-font-size')) $('pref-font-size').value = prefs.fontSize;

    // Idioma
    if ($('pref-language')) $('pref-language').value = prefs.language;

    // Formato de data
    if ($('pref-date-format')) $('pref-date-format').value = prefs.dateFormat;
  }

  /* ============================================================
     SALVAR
     ============================================================ */
  async function salvarPreferencias() {
    const btn = $('btn-save-config');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    // Tema e fonte: localStorage
    if (window.Theme?.set)     window.Theme.set(prefs.theme);
    if (window.Theme?.setFont) window.Theme.setFont(prefs.fontSize);

    // Resto: backend
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          language: prefs.language,
          dateFormat: prefs.dateFormat
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.mensagem || `HTTP ${res.status}`);
      }

      showFeedback('✅ Configurações salvas!', 'success');
    } catch (err) {
      console.error(err);
      showFeedback('❌ Erro ao salvar: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Salvar configurações';
    }
  }

  /* ============================================================
     RESETAR
     ============================================================ */
  function resetarPadroes() {
    if (!confirm('Restaurar todas as configurações para o padrão?')) return;

    prefs = { ...DEFAULT_PREFS };

    if (window.Theme?.set)     window.Theme.set(prefs.theme);
    if (window.Theme?.setFont) window.Theme.setFont(prefs.fontSize);
    renderizarFormulario();
    showFeedback('Padrões restaurados. Clique em "Salvar" para aplicar.', 'success');
  }

  /* ============================================================
     EXPORTAR DADOS
     ============================================================ */
  async function baixarEstante() {
    try {
      const res = await fetch('/api/shelf', { credentials: 'same-origin' });
      if (res.status === 401) {
        alert('Você precisa estar logado.');
        return null;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.livros || [];
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar estante: ' + err.message);
      return null;
    }
  }

  async function exportarJSON() {
    const livros = await baixarEstante();
    if (!livros) return;

    const blob = new Blob([JSON.stringify(livros, null, 2)], { type: 'application/json' });
    baixarArquivo(blob, `spoiler-esperado-estante-${Date.now()}.json`);
    showFeedback('✅ JSON baixado!', 'success');
  }

  async function exportarCSV() {
    const livros = await baixarEstante();
    if (!livros) return;

    const colunas = ['Título', 'Autores', 'Status', 'Nota', 'Ano', 'ISBN', 'Categorias', 'Adicionado em'];
    const linhas = livros.map(l => [
      csvEscape(l.title || ''),
      csvEscape((l.authors || []).join('; ')),
      csvEscape(l.status || ''),
      l.userRating != null ? l.userRating : '',
      csvEscape(l.publishedDate || ''),
      csvEscape(l.isbn || ''),
      csvEscape((l.categories || []).join('; ')),
      csvEscape(l.addedAt || '')
    ]);

    const csv = [colunas.join(','), ...linhas.map(l => l.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    baixarArquivo(blob, `spoiler-esperado-estante-${Date.now()}.csv`);
    showFeedback('✅ CSV baixado!', 'success');
  }

  function csvEscape(str) {
    const s = String(str || '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function baixarArquivo(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ============================================================
     EXCLUIR CONTA
     ============================================================ */
  async function excluirConta() {
    const conf1 = confirm('Tem certeza que deseja excluir sua conta? Esta ação é permanente.');
    if (!conf1) return;

    const conf2 = prompt('Digite EXCLUIR para confirmar:');
    if (conf2 !== 'EXCLUIR') {
      alert('Cancelado.');
      return;
    }

    try {
      const resUser = await fetch('/api/me', { credentials: 'same-origin' });
      if (!resUser.ok) throw new Error('Não foi possível obter o usuário.');
      const user = await resUser.json();

      const res = await fetch('/api/excluir', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: user.email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.mensagem || `HTTP ${res.status}`);

      alert('Conta excluída.');
      window.location.href = '/index.html';
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir: ' + err.message);
    }
  }

  /* ============================================================
     EVENTOS
     ============================================================ */
  function bindEvents() {
    // Tema
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        prefs.theme = btn.dataset.theme;
        if (window.Theme?.set) window.Theme.set(prefs.theme);
        document.querySelectorAll('.theme-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
      });
    });

    // Fonte
    $('pref-font-size')?.addEventListener('change', (e) => {
      prefs.fontSize = e.target.value;
      if (window.Theme?.setFont) window.Theme.setFont(prefs.fontSize);
    });

    // Idioma
    $('pref-language')?.addEventListener('change', (e) => {
      prefs.language = e.target.value;
    });

    // Formato de data
    $('pref-date-format')?.addEventListener('change', (e) => {
      prefs.dateFormat = e.target.value;
    });

    // Ações
    $('btn-save-config')?.addEventListener('click', salvarPreferencias);
    $('btn-reset-config')?.addEventListener('click', resetarPadroes);
    $('btn-export-json')?.addEventListener('click', exportarJSON);
    $('btn-export-csv')?.addEventListener('click', exportarCSV);
    $('btn-delete-account')?.addEventListener('click', excluirConta);
  }

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bindEvents();
      carregarPreferencias();
    });
  } else {
    bindEvents();
    carregarPreferencias();
  }
})();