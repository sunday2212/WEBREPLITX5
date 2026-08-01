// Centralized access control for browser vs PWA detection
// OPTIMIZED FOR GOOGLE AUTO ADS IN PWA MODE
class AccessControl {
  constructor() {
    this.botUserAgents = [
      'Googlebot',
      'Googlebot-Image',
      'Mediapartners-Google',
      'AdsBot-Google',
      'Google-Ads-Overview',
      'Google-Adwords',
      'Google-Site-Verification',
      'Bingbot',
      'Slurp',
      'DuckDuckBot',
      'Baiduspider',
      'YandexBot',
      'facebookexternalhit',
      'twitterbot',
      'rogerbot',
      'linkedinbot',
      'embedly',
      'quora link preview',
      'showyoubot',
      'outbrain',
      'pinterest',
      'developers.google.com/+/web/snippet',
      'www.google.com/webmasters/tools/richsnippets',
      'slackbot',
      'vkShare',
      'W3C_Validator',
      'redditbot',
      'Applebot',
      'WhatsApp',
      'flipboard',
      'tumblr',
      'bitlybot',
      'SkypeUriPreview',
      'nuzzel',
      'Discordbot',
      'Google Page Speed',
      'Qwantify',
      'pinterestbot',
      'Bitrix link preview',
      'XING-contenttabreceiver',
      'Chrome-Lighthouse',
      'TelegramBot'
    ];
  }

  // Check if current context is PWA (standalone mode)
  isPWA() {
    return window.matchMedia && 
           window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
  }

  // Check if user agent is a search engine bot or crawler
  isBot() {
    const userAgent = navigator.userAgent;
    return this.botUserAgents.some(bot => 
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );
  }

  // Check if current page is index.html (public page)
  isIndexPage() {
    const path = window.location.pathname;
    return path === '/' || path === '/index.html' || path.endsWith('/');
  }

  // Check if access is allowed to protected pages
  isAccessAllowed() {
    // Allow bots (for SEO and Google Ads crawling)
    if (this.isBot()) {
      return true;
    }
    
    // Allow PWA users (where Google Ads will work)
    if (this.isPWA()) {
      return true;
    }
    
    // Allow browser access ONLY to index.html
    if (this.isIndexPage()) {
      return true;
    }
    
    // Block browser users from all other pages
    return false;
  }

  // Redirect to index.html with PWA install prompt
  redirectToIndex() {
    const currentPath = window.location.pathname;
    const indexPaths = ['/', '/index.html'];
    
    if (!indexPaths.includes(currentPath)) {
      // Create URL to index.html with current domain
      const baseUrl = window.location.origin;
      const newUrl = new URL(baseUrl);
      newUrl.searchParams.set('pwa-required', 'true');
      newUrl.searchParams.set('attempted-page', currentPath);
      
      // Use replace to avoid back button issues
      window.location.replace(newUrl.toString());
    }
  }

  // Initialize access control for protected pages
  initProtectedPage() {
    // Check if access is allowed
    if (this.isAccessAllowed()) {
      // ✅ NEW: Refresh Ads on protected pages
      this.refreshAds();
      return true;
    }

    // If not allowed, redirect browser users to index.html
    this.redirectToIndex();
    return false;
  }

  // Initialize for index page - show PWA prompt if needed
  initIndexPage() {
    this.showPWAPrompt();
    // ✅ NEW: Refresh Ads on index page as well
    this.refreshAds();
    return true;
  }

  // Show PWA install prompt on index page if redirected
  showPWAPrompt() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('pwa-required') === 'true') {
      const attemptedPage = urlParams.get('attempted-page');
      this.displayInstallPrompt(attemptedPage);
      
      // Clean up URL parameters
      const cleanUrl = new URL(window.location);
      cleanUrl.searchParams.delete('pwa-required');
      cleanUrl.searchParams.delete('attempted-page');
      window.history.replaceState({}, document.title, cleanUrl.toString());
    }
  }

  // Display PWA install prompt
  displayInstallPrompt(attemptedPage) {
    const promptDiv = document.createElement('div');
    promptDiv.id = 'pwa-install-prompt';
    promptDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #2563eb;
      color: white;
      padding: 16px;
      text-align: center;
      z-index: 9999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    
    promptDiv.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px;">📱 Install NEXTPULSE App</h3>
        <p style="margin: 0 0 12px 0; font-size: 14px;">
          To access ${attemptedPage ? attemptedPage.replace('/', '').replace('.html', '') : 'video lectures and quizzes'}, please install our App.
        </p>
        <button onclick="accessControl.installPWA()" style="
          background: white;
          color: #2563eb;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: bold;
          margin-right: 8px;
          cursor: pointer;
        ">Install App</button>
        <button onclick="accessControl.dismissPrompt()" style="
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">Maybe Later</button>
      </div>
    `;
    
    document.body.insertBefore(promptDiv, document.body.firstChild);
  }

  // ✅ NEW METHOD - safely triggers AdSense on each page load
  refreshAds() {
    // Don't run for bots
    if (this.isBot()) return;
    // Don't run if access is blocked (will redirect anyway)
    if (!this.isAccessAllowed()) return;
    // Avoid duplicate pushes on the same page load
    if (window._adsRefreshed) return;
    window._adsRefreshed = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // AdSense script might not be fully loaded yet - safely ignore
    }
  }

  // Install PWA
  installPWA() {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        }
        window.deferredPrompt = null;
      });
    } else {
      // Show manual install instructions
      alert('To install:\n\nChrome/Edge: Menu > Install NEXTPULSE\nSafari: Share > Add to Home Screen\nFirefox: Menu > Install');
    }
    this.dismissPrompt();
  }

  // Dismiss install prompt
  dismissPrompt() {
    const prompt = document.getElementById('pwa-install-prompt');
    if (prompt) {
      prompt.remove();
    }
  }
}

// Global instance
window.accessControl = new AccessControl();

// PWA install prompt handling
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
});

// Listen for app installed event
window.addEventListener('appinstalled', (evt) => {
  console.log('PWA was installed');
});
