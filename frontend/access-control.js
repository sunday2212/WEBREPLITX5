// Centralized access control for browser vs PWA detection.
// Everyone (including search/ad crawlers) gets the SAME behaviour - no special bot access.
class AccessControl {
  // Check if current context is PWA (standalone mode)
  isPWA() {
    return window.matchMedia &&
           (window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches) ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
  }

  // Pages that open in a normal browser. EVERY other page works only
  // inside the installed NEXTPULSE app (PWA).
  //  - index, blog            : public website
  //  - about, contact, privacy, disclaimer : required by Google AdSense
  //  - auth, payment, app, admin : login / payment return / notice / admin
  publicPages() {
    return ['/', '/blog', '/about', '/contact', '/privacy', '/disclaimer',
            '/auth', '/payment', '/app', '/admin'];
  }

  // Normalise "/blog.html", "/blog", "/index.html", "/" ...
  normalisedPath() {
    let p = window.location.pathname || '/';
    try { p = decodeURIComponent(p); } catch (e) { /* keep raw */ }
    if (p.endsWith('/')) p += 'index';
    p = p.replace(/\.html?$/i, '');
    if (p === '/index') p = '/';
    return p;
  }

  // Public page = allowed in a normal browser
  isIndexPage() {
    return this.publicPages().includes(this.normalisedPath());
  }

  // Check if access is allowed to protected pages
  isAccessAllowed() {
    // Allow installed-app (PWA) users
    if (this.isPWA()) {
      return true;
    }
    
    // Allow browser access ONLY to the public pages above
    if (this.isIndexPage()) {
      return true;
    }
    
    // Block browser users from all other pages
    return false;
  }

  // Redirect to index.html with PWA install prompt
  redirectToIndex() {
    const currentPath = window.location.pathname;
    
    if (this.normalisedPath() !== '/') {
      // Hide the protected page immediately so nothing shows before redirect
      try { document.documentElement.style.display = 'none'; } catch (e) { /* ignore */ }
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
      return true;
    }

    // If not allowed, redirect browser users to index.html
    this.redirectToIndex();
    return false;
  }

  // Initialize for index page - show PWA prompt if needed
  initIndexPage() {
    this.showPWAPrompt();
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

// Automatic guard: any page that loads this file is app-only (unless it is
// in publicPages). A normal browser visitor is sent to index.html straight away.
if (!window.accessControl.isAccessAllowed()) {
  window.accessControl.redirectToIndex();
}

// PWA install prompt handling
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
});

// Listen for app installed event
window.addEventListener('appinstalled', (evt) => {
  console.log('PWA was installed');
});
