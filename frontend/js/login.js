document.getElementById('loginForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  if (!email || !senha) return alert('Por favor, preencha todos os campos.');

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, senha })
    });
    const data = await response.json();
    alert(data.mensagem);

    if (response.ok) {
      localStorage.setItem('usuarioLogado', JSON.stringify(data.usuario));
      if (window.OfflineDB) await window.OfflineDB.salvarUsuario(data.usuario);
      window.location.href = '/perfil';
    }
  } catch (err) {
    console.error(err);
    // Modo offline → tenta login local
    if (window.OfflineDB) {
      const off = await window.OfflineDB.obterUsuario(email);
      if (off && (off.senhaHash === senha || off.senha === senha)) {
        localStorage.setItem('usuarioLogado', JSON.stringify(off));
        return (window.location.href = '/perfil');
      }
    }
    alert('Erro ao tentar fazer login. Sem conexão e sem dados locais.');
  }
});