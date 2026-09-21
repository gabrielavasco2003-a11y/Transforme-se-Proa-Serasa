document.getElementById('completarForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const telefone   = document.querySelector("[name='telefone']").value;
  const nascimento = document.querySelector("[name='nascimento']").value;
  const senha      = document.querySelector("[name='senha']").value;

  const payload = { telefone, nascimento, senhaHash: senha };

  try {
    const response = await fetch('/api/completar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // ESSENCIAL para levar a sessão OAuth
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (response.status === 401) {
      alert('Sessão expirada. Faça login novamente.');
      return (window.location.href = '/login.html');
    }

    alert(data.mensagem);
    if (response.ok) {
      if (data.usuario) {
        localStorage.setItem('usuarioLogado', JSON.stringify(data.usuario));
        if (window.OfflineDB) await window.OfflineDB.salvarUsuario(data.usuario);
      }
      window.location.href = '/perfil';
    }
  } catch (err) {
    console.error(err);
    if (window.OfflineDB) {
      await window.OfflineDB.enfileirarRequisicao({
        url: '/api/completar',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      });
    }
    alert('Offline: dados serão enviados quando a conexão voltar.');
    window.location.href = '/perfil';
  }
});