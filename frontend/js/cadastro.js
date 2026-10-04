document.getElementById('cadastroForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const nome            = document.querySelector("[name='nome']").value.trim();
  const usuario         = document.querySelector("[name='usuario']").value.trim();
  const email           = document.querySelector("[name='email']").value.trim();
  const confirmarEmail  = document.querySelector("[name='confirmarEmail']").value.trim();
  const senha           = document.querySelector("[name='senha']").value;
  const confirmarSenha  = document.querySelector("[name='confirmarSenha']").value;
  const telefone        = document.querySelector("[name='telefone']").value;
  const nascimento      = document.querySelector("[name='nascimento']").value;
  const perguntaSenha   = document.querySelector("[name='perguntaSenha']")?.value.trim() || '';

  // --- Validações básicas ---
  if (email !== confirmarEmail) return alert('Os e-mails não coincidem!');
  if (senha !== confirmarSenha) return alert('As senhas não coincidem!');
  if (senha.length < 6)         return alert('A senha deve ter ao menos 6 caracteres.');

  // --- Validação das caixas de concordância ---
  const termosMarcado    = document.getElementById('termos')?.checked    || false;
  const regrasMarcado    = document.getElementById('regras')?.checked    || false;
  const marketingMarcado = document.getElementById('marketing')?.checked || false;

  if (!termosMarcado || !regrasMarcado) {
    return alert('Você precisa aceitar os Termos e Condições e as Regras da comunidade para se cadastrar.');
  }

  // --- Payload correto (campo "senha", não "senhaHash") ---
  const payload = {
    nome,
    usuario,
    email,
    senha,
    telefone,
    nascimento,
    perguntaSenha,
    termos:    termosMarcado,
    regras:    regrasMarcado,
    marketing: marketingMarcado
  };

  try {
    const response = await fetch('/api/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    alert(data.mensagem);

    if (!response.ok) return;

    const user = data.usuario || payload;
    localStorage.setItem('usuarioLogado', JSON.stringify(user));
    if (window.OfflineDB) await window.OfflineDB.salvarUsuario(user);
    window.location.href = '/perfil';

  } catch (err) {
    // Offline → salva localmente e enfileira
    console.error(err);
    localStorage.setItem('usuarioLogado', JSON.stringify(payload));

    if (window.OfflineDB) {
      await window.OfflineDB.salvarUsuario(payload);
      await window.OfflineDB.enfileirarRequisicao({
        url: '/api/cadastro',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      });
    }

    alert('Você está offline. Cadastro será sincronizado ao voltar a conexão.');
    window.location.href = '/perfil';
  }
});

// ✅ Login com Google
function loginGoogle() {
  window.location.href = '/api/google';
}