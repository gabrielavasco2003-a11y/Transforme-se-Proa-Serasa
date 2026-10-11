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

    if (!response.ok) {
      // Se a senha está errada E existe dica, mostra
      if (data.dicaSenha) {
        alert(`Senha incorreta!\n\n💡 Dica de senha: ${data.dicaSenha}`);
      } else {
        alert(data.mensagem);
      }
      return;
    }

    // Login OK
    alert(data.mensagem);
    localStorage.setItem('usuarioLogado', JSON.stringify(data.usuario));
    if (window.OfflineDB) await window.OfflineDB.salvarUsuario(data.usuario);
    window.location.href = '/perfil';
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

// ✅ Login com Google (mesmo comportamento do cadastro.js)
function loginGoogle() {
  window.location.href = '/api/google';
}