/* =========================================================================
   completar.js — Completar cadastro (usuários que entraram com Google)
   Fluxo: preenche form → POST /api/completar → valida (e-mail ou SMS)
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const form       = document.getElementById('completarForm');
  const erroBox    = document.getElementById('completar-erro');
  const btnSalvar  = document.getElementById('btn-salvar') || form.querySelector('button[type="submit"]');
  const radioEmail = document.querySelector('input[name="canalVerificacao"][value="email"]');
  const radioSms   = document.querySelector('input[name="canalVerificacao"][value="sms"]');
  const telefoneEl = document.querySelector("[name='telefone']");

  if (!form) return;

  // ---------- Helpers ----------
  function mostrarErro(msg) {
    if (erroBox) {
      erroBox.textContent = msg;
      erroBox.hidden = false;
      erroBox.classList.remove('hidden');
    } else {
      alert(msg);
    }
  }
  function limparErro() {
    if (!erroBox) return;
    erroBox.textContent = '';
    erroBox.hidden = true;
    erroBox.classList.add('hidden');
  }
  function setLoading(on) {
    if (!btnSalvar) return;
    btnSalvar.disabled = on;
    btnSalvar.textContent = on ? 'Salvando...' : 'Salvar';
  }

  // ---------- Regra: SMS exige telefone ----------
  function atualizarObrigatoriedadeTelefone() {
    if (!telefoneEl) return;
    if (radioSms && radioSms.checked) {
      telefoneEl.required = true;
      telefoneEl.setAttribute('aria-required', 'true');
    } else {
      telefoneEl.required = false;
      telefoneEl.removeAttribute('aria-required');
    }
  }
  if (radioEmail) radioEmail.addEventListener('change', atualizarObrigatoriedadeTelefone);
  if (radioSms)   radioSms.addEventListener('change', atualizarObrigatoriedadeTelefone);
  atualizarObrigatoriedadeTelefone();

  // ---------- Envio ----------
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    limparErro();

    // ---------- 1. Captura dos campos ----------
    const usuario         = (document.getElementById('usuario')?.value || '').trim();
    const telefone        = (telefoneEl?.value || '').trim();
    const nascimento      = document.getElementById('nascimento')?.value || '';
    const senha           = document.getElementById('senha')?.value || '';
    const canalVerificacao = document.querySelector('input[name="canalVerificacao"]:checked')?.value || 'email';
    const termos          = document.getElementById('termos')?.checked || false;
    const regras          = document.getElementById('regras')?.checked || false;
    const marketing       = document.getElementById('marketing')?.checked || false;

    // ---------- 2. Validações ----------
    if (!termos || !regras) {
      return mostrarErro('Você precisa aceitar os Termos e as Regras da comunidade.');
    }
    if (canalVerificacao === 'sms') {
      if (!telefone) return mostrarErro('Informe seu telefone para receber o código por SMS.');
      const digits = telefone.replace(/\D/g, '');
      if (digits.length < 10) return mostrarErro('Telefone inválido. Use DDD + número.');
    }
    if (!nascimento) return mostrarErro('Informe sua data de nascimento.');
    if (!senha || senha.length < 6) return mostrarErro('A senha deve ter ao menos 6 caracteres.');

    // ---------- 3. Payload ----------
    const payload = {
      usuario,
      telefone,
      nascimento,
      senha,
      canalVerificacao,
      termos,
      regras,
      marketing
    };

    setLoading(true);

    // ---------- 4. Envia para o backend ----------
    try {
      const response = await fetch('/api/completar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      // Sessão expirada
      if (response.status === 401) {
        alert('Sessão expirada. Faça login novamente.');
        return (window.location.href = '/login.html');
      }

      if (!response.ok) {
        setLoading(false);
        return mostrarErro(data.mensagem || 'Erro ao completar cadastro.');
      }

      // ---------- 5. Salva usuário localmente ----------
      if (data.usuario) {
        localStorage.setItem('usuarioLogado', JSON.stringify(data.usuario));
        if (window.OfflineDB) {
          try { await window.OfflineDB.salvarUsuario(data.usuario); } catch (_) {}
        }
      }

      // ---------- 6. Redireciona conforme o canal ----------
      if (canalVerificacao === 'sms') {
        sessionStorage.setItem('validarTelefone', telefone);
        window.location.href = '/validar-codigo.html';
      } else {
        sessionStorage.setItem('validarEmail', data?.usuario?.email || '');
        window.location.href = '/validar-codigo.html';
      }

    } catch (err) {
      console.error(err);

      // ---------- 7. Modo offline ----------
      if (window.OfflineDB) {
        try {
          await window.OfflineDB.enfileirarRequisicao({
            url: '/api/completar',
            options: {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }
          });
        } catch (_) {}
      }
      alert('Offline: dados serão enviados quando a conexão voltar.');
      window.location.href = '/perfil';
    } finally {
      setLoading(false);
    }
  });
});