/* =========================================================================
   completar.js — Completar cadastro (usuários que entraram com Google)
   Fluxo: preenche form → POST /api/completar → envia SMS → valida telefone
   ========================================================================= */

document.getElementById('completarForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  // ---------- 1. Captura dos campos ----------
  const telefone   = document.querySelector("[name='telefone']").value.trim();
  const nascimento = document.querySelector("[name='nascimento']").value;
  const senha      = document.querySelector("[name='senha']").value;

  // ---------- 2. Validação básica ----------
  if (!telefone) return alert('Informe seu telefone.');
  const digits = telefone.replace(/\D/g, '');
  if (digits.length < 10) return alert('Telefone inválido. Use DDD + número.');

  if (!nascimento) return alert('Informe sua data de nascimento.');
  if (senha.length < 6) return alert('A senha deve ter ao menos 6 caracteres.');

  // ---------- 3. Payload (campo "senha", não "senhaHash") ----------
  const payload = { telefone, nascimento, senha };

  // ---------- 4. Envia para o backend ----------
  try {
    const response = await fetch('/api/completar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // Sessão expirada
    if (response.status === 401) {
      alert('Sessão expirada. Faça login novamente.');
      return (window.location.href = '/login.html');
    }

    alert(data.mensagem);
    if (!response.ok) return;

    // ---------- 5. Salva usuário localmente ----------
    if (data.usuario) {
      localStorage.setItem('usuarioLogado', JSON.stringify(data.usuario));
      if (window.OfflineDB) await window.OfflineDB.salvarUsuario(data.usuario);
    }

    // ---------- 6. Redireciona para validação de telefone ----------
    sessionStorage.setItem('validarTelefone', telefone);
    window.location.href = '/validar-codigo.html';

  } catch (err) {
    // ---------- 7. Modo offline ----------
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