// ================================================================
// editar-perfil.js — Edição de perfil + seletor de avatar
// - Carrega os dados do usuário logado
// - Salva alterações via /api/completar (ou nova rota)
// - Seletor de avatar com 9 fotos em /img/perfil/1.png ... 9.png
// ================================================================

(function () {
  'use strict';

  const AVATARES = [
    '/img/perfil/1.png',
    '/img/perfil/2.png',
    '/img/perfil/3.png',
    '/img/perfil/4.png',
    '/img/perfil/5.png',
    '/img/perfil/6.png',
    '/img/perfil/7.png',
    '/img/perfil/8.png',
    '/img/perfil/9.png'
  ];

  const $ = (id) => document.getElementById(id);

  let avatarSelecionado = null;

  /* ============================================================
     HELPERS
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

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
  }

  /* ============================================================
     CARREGAR DADOS DO USUÁRIO
     ============================================================ */
  async function carregarUsuario() {
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      if (res.status === 401) {
        alert('Você precisa estar logado.');
        window.location.href = '/login.html?redirect=/editar-perfil';
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const user = await res.json();

      // Preenche o formulário
      $('username').value = user.usuario || '';
      $('nome').value     = user.nome || '';
      $('email').value    = user.email || '';

      // Aplica o avatar salvo (ou o padrão = 1.png)
      const avatarSalvo = user.avatar || AVATARES[0];
      aplicarAvatar(avatarSalvo);

    } catch (err) {
      console.error('Erro ao carregar usuário:', err);
      alert('Não foi possível carregar seus dados.');
    }
  }

  function aplicarAvatar(url) {
    const img = $('perfil-avatar-img');
    if (img) {
      img.src = url;
      img.alt = 'Avatar do usuário';
      img.onerror = () => { img.src = AVATARES[0]; };
    }
  }

  /* ============================================================
     MODAL DE AVATARES
     ============================================================ */
  function abrirModalAvatar() {
    const modal = $('avatar-modal');
    const grid = $('avatar-grid');
    if (!modal || !grid) return;

    // Preenche o grid com as 9 opções
    grid.innerHTML = '';
    AVATARES.forEach((url, i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'avatar-option';
      card.dataset.url = url;
      card.setAttribute('aria-label', `Escolher avatar ${i + 1}`);
      card.innerHTML = `<img src="${url}" alt="Avatar ${i + 1}">`;

      card.addEventListener('click', () => {
        // Marca selecionado
        grid.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
        card.classList.add('selected');
        avatarSelecionado = url;
      });

      grid.appendChild(card);
    });

    // Marca o avatar atual como selecionado
    const atual = $('perfil-avatar-img')?.src || AVATARES[0];
    const cards = grid.querySelectorAll('.avatar-option');
    cards.forEach(c => {
      if (c.dataset.url && atual.includes(c.dataset.url.replace(/^\//, ''))) {
        c.classList.add('selected');
        avatarSelecionado = c.dataset.url;
      }
    });

    mostrar(modal, 'flex');
  }

  function fecharModalAvatar() {
    esconder($('avatar-modal'));
    avatarSelecionado = null;
  }

  async function salvarAvatar() {
    if (!avatarSelecionado) {
      alert('Escolha um avatar primeiro.');
      return;
    }

    try {
      const res = await fetch('/api/perfil/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ avatar: avatarSelecionado })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.mensagem || `HTTP ${res.status}`);

      aplicarAvatar(avatarSelecionado);
      fecharModalAvatar();
      alert('Avatar atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar avatar: ' + err.message);
    }
  }

  /* ============================================================
     SALVAR ALTERAÇÕES DO FORMULÁRIO
     ============================================================ */
  async function salvarAlteracoes(e) {
    e.preventDefault();

    const nome     = $('nome').value.trim();
    const username = $('username').value.trim();
    const senha    = $('senha').value;

    const payload = {};
    if (nome)     payload.nome = nome;
    if (username) payload.usuario = username;
    if (senha)    payload.senha = senha;

    if (!Object.keys(payload).length) {
      alert('Nada para alterar.');
      return;
    }

    try {
      const res = await fetch('/api/perfil/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.mensagem || `HTTP ${res.status}`);

      alert('Alterações salvas!');
      window.location.href = '/perfil.html';
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar: ' + err.message);
    }
  }

  /* ============================================================
     EXCLUIR CONTA
     ============================================================ */
  async function excluirConta() {
    const confirmar = confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.');
    if (!confirmar) return;

    const email = $('email').value.trim();
    if (!email) {
      alert('E-mail não encontrado.');
      return;
    }

    try {
      const res = await fetch('/api/excluir', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.mensagem || `HTTP ${res.status}`);

      alert('Conta excluída.');
      window.location.href = '/index.html';
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir conta: ' + err.message);
    }
  }

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */
  function bindEvents() {
    $('alterar-foto')?.addEventListener('click', abrirModalAvatar);
    $('fechar-modal-avatar')?.addEventListener('click', fecharModalAvatar);
    $('cancelar-avatar')?.addEventListener('click', fecharModalAvatar);
    $('salvar-avatar')?.addEventListener('click', salvarAvatar);
    $('form-editar')?.addEventListener('submit', salvarAlteracoes);
    $('excluir-conta')?.addEventListener('click', excluirConta);

    // Fechar modal ao clicar fora
    $('avatar-modal')?.addEventListener('click', (e) => {
      if (e.target === $('avatar-modal')) fecharModalAvatar();
    });

    // ESC fecha o modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') fecharModalAvatar();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      carregarUsuario();
      bindEvents();
    });
  } else {
    carregarUsuario();
    bindEvents();
  }
})();