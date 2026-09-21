// Renderiza dados no DOM
function renderPerfil(user) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('nomePerfil',         user.nome     || 'Usuário');
  set('nomeCompletoPerfil', user.nome     || '—');
  set('emailPerfil',        user.email    || '—');
  set('usuarioPerfil',      user.usuario  || '—');
  set('nascimentoPerfil',   user.nascimento
        ? new Date(user.nascimento).toLocaleDateString('pt-BR') : '—');
}

// Carrega da sessão do servidor; se offline cai no IndexedDB/localStorage
async function carregarPerfil() {
  // 1) Tenta sessão ativa (fonte da verdade)
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (res.ok) {
      const user = await res.json();
      renderPerfil(user);
      localStorage.setItem('usuarioLogado', JSON.stringify(user));
      if (window.OfflineDB) await window.OfflineDB.salvarUsuario(user);
      return user;
    }
  } catch (err) {
    console.warn('Sem conexão, usando dados locais.', err);
  }

  // 2) Fallback localStorage
  const local = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
  if (local) {
    renderPerfil(local);
    return local;
  }

  // 3) Fallback IndexedDB (offline)
  if (window.OfflineDB && local?.email) {
    const off = await window.OfflineDB.obterUsuario(local.email);
    if (off) { renderPerfil(off); return off; }
  }

  // 4) Nada → manda para login
  window.location.href = '/login.html';
  return null;
}

carregarPerfil();

// Ações
document.getElementById('editar-perfil')?.addEventListener('click', () => {
  window.location.href = '/editar-perfil.html';
});

document.getElementById('excluir-conta')?.addEventListener('click', async () => {
  if (!confirm('Tem certeza que deseja excluir sua conta?')) return;
  const local = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
  if (!local?.email) return;

  try {
    const res = await fetch('/api/excluir', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: local.email })
    });
    const data = await res.json();
    alert(data.mensagem);
  } catch (err) {
    alert('Erro ao excluir (offline). Tente novamente com internet.');
    return;
  }
  localStorage.removeItem('usuarioLogado');
  window.location.href = '/index.html';
});

document.getElementById('logout')?.addEventListener('click', async () => {
  try { await fetch('/api/logout', { credentials: 'include' }); } catch (_) {}
  localStorage.removeItem('usuarioLogado');
  alert('Você saiu da conta.');
  window.location.href = '/index.html';
});

document.getElementById('ver-mais')?.addEventListener('click', () => {
  window.location.href = '/perfil';
});