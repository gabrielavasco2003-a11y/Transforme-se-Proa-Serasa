/* =========================================================================
   validar.js — usado por:
   - validar-telefone.html  (função global: enviarCodigoTelefone)
   - validar-codigo.html    (função global: validarCodigoTelefone)
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
      inputs[Math.min(digits.length, inputs.length - 1)].focus();
      if (lerCodigo().length === inputs.length && typeof onComplete === 'function') onComplete();
    });
  });
  if (inputs[0]) inputs[0].focus();
}

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
// PÁGINA 1 — validar-telefone.html
// =========================================================================
window.enviarCodigoTelefone = async function () {
  const telInput = document.getElementById('telefone');
  const telefone = telInput ? telInput.value.trim() : '';

  if (!telefone) return alert('Informe seu telefone.');
  const digits = telefone.replace(/\D/g, '');
  if (digits.length < 10) return alert('Telefone inválido. Use DDD + número.');

  const btn = document.querySelector('#telefoneForm button');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    const { ok, data } = await postJSON('/api/validar-telefone/enviar', { telefone });
    if (!ok) {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
      return alert(data.mensagem || 'Erro ao enviar SMS.');
    }

    sessionStorage.setItem('validarTelefone', telefone);
    alert('Código enviado por SMS!');
    location.href = 'validar-codigo.html';
  } catch (err) {
    console.error(err);
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
    alert('Erro de conexão. Tente novamente.');
  }
};

// =========================================================================
// PÁGINA 2 — validar-codigo.html
// =========================================================================
window.validarCodigoTelefone = async function () {
  const codigo = lerCodigo();
  if (codigo.length < 5) return alert('Preencha o código de 5 dígitos.');

  const btn = document.querySelector('#codigoTelefoneForm button');
  if (btn) { btn.disabled = true; btn.textContent = 'Validando...'; }

  try {
    const { ok, data, status } = await postJSON('/api/validar-telefone/validar', { codigo });
    if (status === 401) {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
      alert('Você precisa estar logado.');
      return location.href = 'login.html';
    }
    if (!ok) {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
      return alert(data.mensagem || 'Código inválido.');
    }

    sessionStorage.removeItem('validarTelefone');
    alert('Telefone verificado com sucesso!');
    location.href = 'perfil.html';
  } catch (err) {
    console.error(err);
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
    alert('Erro de conexão. Tente novamente.');
  }
};

// =========================================================================
// BOOTSTRAP
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Página 1 — telefone
  if (document.getElementById('telefoneForm')) {
    const form = document.getElementById('telefoneForm');
    form.addEventListener('submit', (e) => { e.preventDefault(); window.enviarCodigoTelefone(); });

    // Máscara simples de telefone BR: (99) 99999-9999
    const tel = document.getElementById('telefone');
    if (tel) {
      tel.addEventListener('input', () => {
        let v = tel.value.replace(/\D/g, '').slice(0, 11);
        if (v.length > 10)      v = v.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
        else if (v.length > 6)  v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        else if (v.length > 2)  v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
        tel.value = v;
      });
    }
  }

  // Página 2 — código
  if (document.getElementById('codigoTelefoneForm')) {
    setupInputsCodigo();
    const form = document.getElementById('codigoTelefoneForm');
    form.addEventListener('submit', (e) => { e.preventDefault(); window.validarCodigoTelefone(); });

    iniciarTimer(30, async () => {
      const telefone = sessionStorage.getItem('validarTelefone');
      if (!telefone) return alert('Sessão expirada. Informe o telefone novamente.');
      const { ok, data } = await postJSON('/api/validar-telefone/enviar', { telefone });
      if (ok) {
        alert('Novo código enviado!');
        pegarInputsCodigo().forEach(i => i.value = '');
        iniciarTimer(30, arguments.callee);
      } else {
        alert(data.mensagem || 'Erro ao reenviar.');
      }
    });
  }
});