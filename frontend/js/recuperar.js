/* =========================================================================
   recuperar.js — usado por:
   - recuperar-email.html   (função global: enviarCodigo)
   - recuperar-codigo.html  (função global: validarCodigo)
   - recuperar-senha.html   (função global: salvarSenha)
   ========================================================================= */

// ---------- Utilitários ----------
function pegarInputsCodigo() {
  const wrap = document.querySelector('.codigo');
  return wrap ? Array.from(wrap.querySelectorAll('input')) : [];
}

function lerCodigo() {
  return pegarInputsCodigo().map(i => i.value.trim()).join('');
}

function setupInputsCodigo(onComplete) {
  const inputs = pegarInputsCodigo();
  inputs.forEach((input, i) => {
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'one-time-code');

    input.addEventListener('input', (e) => {
      e.target.value = (e.target.value || '').replace(/\D/g, '').slice(0, 1);
      if (e.target.value && i < inputs.length - 1) inputs[i + 1].focus();
      if (lerCodigo().length === inputs.length && typeof onComplete === 'function') onComplete();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) inputs[i - 1].focus();
      if (e.key === 'ArrowLeft'  && i > 0) inputs[i - 1].focus();
      if (e.key === 'ArrowRight' && i < inputs.length - 1) inputs[i + 1].focus();
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const colado = (e.clipboardData || window.clipboardData).getData('text') || '';
      const digits = colado.replace(/\D/g, '').split('');
      for (let j = 0; j < inputs.length; j++) inputs[j].value = digits[j] || '';
      const next = Math.min(digits.length, inputs.length - 1);
      inputs[next].focus();
      if (lerCodigo().length === inputs.length && typeof onComplete === 'function') onComplete();
    });
  });
  if (inputs[0]) inputs[0].focus();
}

// Timer reutilizável: "Reenviar código em 00:29s" e depois vira link
function iniciarTimer(segundos, onReenviar) {
  const timerEl = document.getElementById('timer');
  if (!timerEl) return;

  let restante = segundos;
  let intervalId = null;

  const render = () => {
    if (restante > 0) {
      timerEl.innerHTML = `Reenviar código em <strong>${String(restante).padStart(2, '0')}s</strong>`;
    } else {
      timerEl.innerHTML = `<a href="#" id="reenviarLink" style="font-weight:600;cursor:pointer">Reenviar código</a>`;
      const link = document.getElementById('reenviarLink');
      if (link) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          clearInterval(intervalId);
          if (typeof onReenviar === 'function') onReenviar();
        });
      }
    }
  };

  render();
  intervalId = setInterval(() => {
    restante--;
    render();
    if (restante <= 0) clearInterval(intervalId);
  }, 1000);
}

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
window.enviarCodigo = async function () {
  const emailInput = document.getElementById('email');
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email) return alert('Informe seu e-mail.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('E-mail inválido.');

  const btn = document.querySelector('#recuperarForm button');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    const { ok, data } = await postJSON('/api/recuperar/enviar-codigo', { email });
    if (!ok) {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
      return alert(data.mensagem || 'Erro ao enviar código.');
    }

    sessionStorage.setItem('recuperarEmail', email);
    alert('Código enviado! Verifique seu e-mail.');
    location.href = 'recuperar-codigo.html';
  } catch (err) {
    console.error(err);
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
    alert('Erro de conexão. Tente novamente.');
  }
};

// =========================================================================
// PÁGINA 2 — recuperar-codigo.html
// =========================================================================
window.validarCodigo = async function () {
  const email = sessionStorage.getItem('recuperarEmail');
  if (!email) {
    alert('Sessão expirada. Informe o e-mail novamente.');
    return location.href = 'recuperar-email.html';
  }

  const codigo = lerCodigo();
  if (codigo.length < 5) return alert('Preencha o código de 5 dígitos.');

  const btn = document.querySelector('#codigoForm button');
  if (btn) { btn.disabled = true; btn.textContent = 'Validando...'; }

  try {
    const { ok, data } = await postJSON('/api/recuperar/validar-codigo', { email, codigo });
    if (!ok) {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
      return alert(data.mensagem || 'Código inválido.');
    }

    sessionStorage.setItem('recuperarCodigo', codigo);
    location.href = 'recuperar-senha.html';
  } catch (err) {
    console.error(err);
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
    alert('Erro de conexão. Tente novamente.');
  }
};

// =========================================================================
// PÁGINA 3 — recuperar-senha.html
// =========================================================================
window.salvarSenha = async function () {
  const email = sessionStorage.getItem('recuperarEmail');
  const codigo = sessionStorage.getItem('recuperarCodigo');

  if (!email || !codigo) {
    alert('Sessão expirada. Reinicie a recuperação.');
    return location.href = 'recuperar-email.html';
  }

  const novaSenha   = (document.getElementById('novaSenha')   || {}).value || '';
  const confirmaSenha = (document.getElementById('confirmaSenha') || {}).value || '';

  if (!novaSenha || !confirmaSenha) return alert('Preencha os dois campos.');
  if (novaSenha.length < 6)         return alert('A senha deve ter no mínimo 6 caracteres.');
  if (novaSenha !== confirmaSenha)  return alert('As senhas não coincidem.');

  const btn = document.querySelector('#senhaForm button');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

  try {
    const { ok, data } = await postJSON('/api/recuperar/nova-senha', {
      email, codigo, novaSenha
    });
    if (!ok) {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
      return alert(data.mensagem || 'Erro ao alterar senha.');
    }

    sessionStorage.removeItem('recuperarEmail');
    sessionStorage.removeItem('recuperarCodigo');

    alert('Senha alterada com sucesso!');
    location.href = 'perfil.html';
  } catch (err) {
    console.error(err);
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
    alert('Erro de conexão. Tente novamente.');
  }
};

// =========================================================================
// BOOTSTRAP — liga os handlers específicos da página atual
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Página 1 — e-mail
  if (document.getElementById('recuperarForm')) {
    const form = document.getElementById('recuperarForm');
    form.addEventListener('submit', (e) => { e.preventDefault(); window.enviarCodigo(); });
  }

  // Página 2 — código
  if (document.getElementById('codigoForm')) {
    setupInputsCodigo(() => {
      // auto-valida ao completar todos os 5 dígitos (opcional: descomente abaixo)
      // window.validarCodigo();
    });
    const form = document.getElementById('codigoForm');
    form.addEventListener('submit', (e) => { e.preventDefault(); window.validarCodigo(); });

    // Timer de 30s + link de reenviar
    iniciarTimer(30, async () => {
      const email = sessionStorage.getItem('recuperarEmail');
      if (!email) return alert('Sessão expirada.');
      const { ok, data } = await postJSON('/api/recuperar/enviar-codigo', { email });
      if (ok) {
        alert('Novo código enviado!');
        // limpa os inputs e reinicia o timer
        pegarInputsCodigo().forEach(i => i.value = '');
        iniciarTimer(30, arguments.callee);
      } else {
        alert(data.mensagem || 'Erro ao reenviar.');
      }
    });
  }

  // Página 3 — nova senha
  if (document.getElementById('senhaForm')) {
    const form = document.getElementById('senhaForm');
    form.addEventListener('submit', (e) => { e.preventDefault(); window.salvarSenha(); });
  }
});