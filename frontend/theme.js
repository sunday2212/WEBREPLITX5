/* Theme initialiser — must run before any render to prevent flash */
(function () {
  var theme = localStorage.getItem('theme') || 'dark';
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  /* expose helper for other scripts */
  window._theme = {
    get: function () { return localStorage.getItem('theme') || 'dark'; },
    set: function (t) {
      localStorage.setItem('theme', t);
      if (t === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    },
    toggle: function () { window._theme.set(window._theme.get() === 'dark' ? 'light' : 'dark'); }
  };
})();
