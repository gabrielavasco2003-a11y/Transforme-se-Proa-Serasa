// Banner de cookies — Spoiller Esperado
(function () {
  function init() {
    const KEY = 'spoiller_cookies_consent';
    const banner = document.getElementById('cookie-banner');
    if (!banner) return;

    if (localStorage.getItem(KEY)) return;

    banner.classList.add('visible');

    const btnAccept = document.getElementById('cookie-accept');
    const btnReject = document.getElementById('cookie-reject');

    function fechar(valor) {
      localStorage.setItem(KEY, valor);
      banner.classList.remove('visible');
    }

    if (btnAccept) btnAccept.addEventListener('click', () => fechar('aceito'));
    if (btnReject) btnReject.addEventListener('click', () => fechar('recusado'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();