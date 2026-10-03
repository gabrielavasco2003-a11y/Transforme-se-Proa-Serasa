// ================================================================
// institucional.js — JS das páginas institucionais
// - Botão "Voltar para o início" com histórico
// ================================================================

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const btnVoltar = document.querySelector('.btn-voltar');
    if (!btnVoltar) return;

    // Se o usuário veio de outra página do site, volta pelo histórico
    // Se não (abriu direto), vai pro index
    btnVoltar.addEventListener('click', function (e) {
      if (document.referrer && document.referrer.includes(window.location.host)) {
        e.preventDefault();
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/index.html';
        }
      }
      // Senão: deixa o link normal funcionar (vai pra /index.html)
    });
  });
})();