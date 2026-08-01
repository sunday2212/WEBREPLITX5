
// PWA Installation Handler for index.html
document.addEventListener('DOMContentLoaded', function() {
  // Initialize access control and show PWA prompt if needed
  if (window.accessControl) {
    accessControl.showPWAPrompt();
  }
  
  // Enhanced PWA install prompt handling
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.deferredPrompt = e; // Make it available globally
  });
  
  // Add install button functionality if it exists
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
      }
    });
  }
  
  // Listen for app installed event
  window.addEventListener('appinstalled', (evt) => {
    console.log('PWA was installed');
    // Hide install prompts
    const prompt = document.getElementById('pwa-install-prompt');
    if (prompt) {
      prompt.remove();
    }
  });
});
