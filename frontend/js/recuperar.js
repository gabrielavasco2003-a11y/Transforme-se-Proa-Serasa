/* =========================================================================
   recuperar.js — NOVO (link com token)
   Usado por:
   - recuperar-email.html  → solicita o link de recuperação
   - recuperar-senha.html  → lê ?token= da URL e redefine a senha
   ========================================================================= */

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  let data = {};
  try { data = await r.json(); } catch (_) {}
  return { ok: r.ok, status: r.status, data };
}

// =========================================================================
// PÁGINA 1 — recuperar-email.html
// =========================================================================
async function solicitarRecuperacao() {
  const emailInput = document.getElementById('email')
                  || document.querySelector("[name='email']");
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email) return alert('Informe seu e-mail.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('E-mail inválido.');

  const btn = document.querySelector('form button[type="submit"]')
           || document.querySelector('#recuperarForm button');
  const textoOriginal = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    const { ok, data } = await postJSON('/api/recuperar/solicitar', { email });

    if (btn) { btn.disabled = false; btn.textContent = textoOriginal; }

    if (!ok) {
      return alert(data.mensagem || 'Erro ao solicitar recuperação.');
    }

    alert(data.mensagem || 'Se este e-mail estiver cadastrado, enviaremos um link.');
    // opcional: limpar o campo
    if (emailInput) emailInput.value = '';
  } catch (err) {
    console.error(err);
    if (btn) { btn.disabled = false; btn.textContent = textoOriginal; }
    alert('Erro de conexão. Tente novamente.');
  }
}

// =========================================================================
// PÁGINA 2 — recuperar-senha.html
// =========================================================================
async function redefinirSenha() {
  // Lê token da URL
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');

  if (!token) {
    alert('Link inválido. Solicite uma nova recuperação de senha.');
    return location.href = 'recuperar-email.html';
  }

  // Pega os campos (aceita name="novaSenha" ou id="novaSenha")
  const inputNova     = document.querySelector("[name='novaSenha']")
                     || document.getElementById('novaSenha');
  const inputConfirmar = document.querySelector("[name='confirmarSenha']")
                     || document.getElementById('confirmaSenha')
                     || document.getElementById('confirmarSenha');

  const novaSenha     = inputNova ? inputNova.value : '';
  const confirmarSenha = inputConfirmar ? inputConfirmar.value : '';

  if (!novaSenha || !confirmarSenha) return alert('Preencha os dois campos.');
  if (novaSenha.length < 6)          return alert('A senha deve ter no mínimo 6 caracteres.');
  if (novaSenha !== confirmarSenha)  return alert('As senhas não coincidem.');

  const btn = document.querySelector('form button[type="submit"]')
           || document.querySelector('#senhaForm button');
  const textoOriginal = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

  try {
    const { ok, data } = await postJSON('/api/recuperar/redefinir', {
      token, novaSenha
    });

    if (btn) { btn.disabled = false; btn.textContent = textoOriginal; }

    if (!ok) {
      return alert(data.mensagem || 'Erro ao alterar senha.');
    }

    alert(data.mensagem || 'Senha alterada com sucesso!');
    location.href = 'login.html';
  } catch (err) {
    console.error(err);
    if (btn) { btn.disabled = false; btn.textContent = textoOriginal; }
    alert('Erro de conexão. Tente novamente.');
  }
}

// =========================================================================
// BOOTSTRAP — liga o handler conforme a página
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Página 1: recuperar-email.html
  // (aceita form com id="recuperarForm" OU qualquer form que tenha campo [name="email"])
  const formEmail = document.getElementById('recuperarForm')
                 || document.querySelector('form');
  const temCampoEmail = document.querySelector("[name='email']") || document.getElementById('email');
  if (temCampoEmail && formEmail && !document.getElementById('codigoForm') && !document.getElementById('senhaForm')) {
    formEmail.addEventListener('submit', (e) => {
      e.preventDefault();
      solicitarRecuperacao();
    });
  }

  // Página 2: recuperar-senha.html
  const formSenha = document.getElementById('senhaForm')
                 || document.querySelector('form');
  const temCampoNovaSenha = document.getElementById('novaSenha')
                         || document.querySelector("[name='novaSenha']");
  if (temCampoNovaSenha && formSenha) {
    formSenha.addEventListener('submit', (e) => {
      e.preventDefault();
      redefinirSenha();
    });
  }
});