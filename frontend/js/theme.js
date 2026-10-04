// ================================================================
// theme.js — Aplica o tema (claro/escuro/auto) em todas as páginas
// - Lê do localStorage: spoiler_tema (light/dark/auto)
// - Aplica class="dark" ou class="light" no <html>
// - Também aplica o tamanho de fonte (small/medium/large)
// ================================================================

(function () {
  'use strict';

  const THEME_KEY = 'spoiler_tema';
  const FONT_KEY  = 'spoiler_font_size';
  const html = document.documentElement;

  /* ---------- Tema ---------- */
  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'auto'; }
    catch (_) { return 'auto'; }
  }

  function sistemaPrefereEscuro() {
    return window.matchMedia &&
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function aplicarTema() {
    const pref = getTheme();
    const tema = pref === 'auto' ? (sistemaPrefereEscuro() ? 'dark' : 'light') : pref;
    html.classList.remove('light', 'dark');
    html.classList.add(tema);
    html.setAttribute('data-theme', tema);
  }

  /* ---------- Tamanho de fonte ---------- */
  function getFontSize() {
    try { return localStorage.getItem(FONT_KEY) || 'medium'; }
    catch (_) { return 'medium'; }
  }

  function aplicarFonte() {
    const size = getFontSize();
    html.classList.remove('font-small', 'font-medium', 'font-large');
    html.classList.add(`font-${size}`);
  }

  /* ---------- Aplica IMEDIATAMENTE (evita flash) ---------- */
  aplicarTema();
  aplicarFonte();

  /* ---------- Escuta mudanças do sistema ---------- */
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getTheme() === 'auto') aplicarTema();
    });
  }

  /* ---------- API global ---------- */
  window.Theme = {
    get:      getTheme,
    set: (pref) => {
      try { localStorage.setItem(THEME_KEY, pref); } catch (_) {}
      aplicarTema();
    },
    getFont:  getFontSize,
    setFont: (size) => {
      try { localStorage.setItem(FONT_KEY, size); } catch (_) {}
      aplicarFonte();
    },
    aplicar:  () => { aplicarTema(); aplicarFonte(); }
  };
})();