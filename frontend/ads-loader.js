/* Google Auto Ads - one line on every page:
     <script src="/ads-loader.js" defer></script>
   Loads the official AdSense Auto Ads script once the page is open and
   visible, so pages that instantly redirect (login / install-app) never
   send an ad request. */
(function () {
  var AD_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5920367457745298';

  function load() {
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return;
    if (window.accessControl && !window.accessControl.isAccessAllowed()) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = AD_SRC;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }

  function start() {
    if (document.visibilityState === 'visible') {
      setTimeout(load, 1500);
    } else {
      document.addEventListener('visibilitychange', function onVis() {
        if (document.visibilityState !== 'visible') return;
        document.removeEventListener('visibilitychange', onVis);
        setTimeout(load, 1500);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
