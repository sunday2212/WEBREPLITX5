
// Disable text selection globally
document.addEventListener('selectstart', function(e) {
  // Allow selection for Google Ads iframes
  if (e.target.closest('iframe') && e.target.closest('iframe').src.includes('googlesyndication')) {
    return true;
  }
  e.preventDefault();
  return false;
}, false);

// Disable right-click context menu
document.addEventListener('contextmenu', function(e) {
  // Allow for Google Ads iframes
  if (e.target.closest('iframe') && e.target.closest('iframe').src.includes('googlesyndication')) {
    return true;
  }
  e.preventDefault();
  return false;
});

// Disable copy
document.addEventListener('copy', function(e) {
  // Allow copy for Google Ads
  if (e.target.closest('iframe') && e.target.closest('iframe').src.includes('googlesyndication')) {
    return true;
  }
  e.preventDefault();
  return false;
});

// Disable cut
document.addEventListener('cut', function(e) {
  e.preventDefault();
  return false;
});

// Disable keyboard shortcuts for copy/paste/print
document.addEventListener('keydown', function(e) {
  // Block Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+A, Ctrl+P, Ctrl+S, Ctrl+U, F12
  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase();
    if (['c', 'x', 'v', 'a', 'p', 's', 'u'].includes(key)) {
      e.preventDefault();
      return false;
    }
  }
  
  // Block F12 (developer tools)
  if (e.key === 'F12' || e.keyCode === 123) {
    e.preventDefault();
    return false;
  }
  
  // Block Ctrl+Shift+I (inspect element)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
    e.preventDefault();
    return false;
  }
  
  // Block Ctrl+Shift+J (console)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'j') {
    e.preventDefault();
    return false;
  }
  
  // Block Ctrl+Shift+C (inspect)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
    e.preventDefault();
    return false;
  }
});

// Disable drag
document.addEventListener('dragstart', function(e) {
  // Allow for Google Ads
  if (e.target.closest('iframe') || e.target.tagName === 'INS') {
    return true;
  }
  e.preventDefault();
  return false;
});

// Disable long press on mobile
let touchTimer;
document.addEventListener('touchstart', function(e) {
  // Allow for Google Ads
  if (e.target.closest('iframe') || e.target.closest('ins.adsbygoogle')) {
    return true;
  }
  
  // Clear any existing timer
  clearTimeout(touchTimer);
  
  // Set timer for long press (500ms)
  touchTimer = setTimeout(function() {
    e.preventDefault();
  }, 500);
  
  // Prevent multi-touch zoom
  if (e.touches.length > 1) {
    e.preventDefault();
    return false;
  }
}, { passive: false });

document.addEventListener('touchend', function(e) {
  // Clear long press timer
  clearTimeout(touchTimer);
  
  // Prevent multi-touch
  if (e.touches.length > 1) {
    e.preventDefault();
    return false;
  }
}, { passive: false });

document.addEventListener('touchmove', function(e) {
  // Allow scrolling but prevent other gestures
  if (e.touches.length > 1) {
    e.preventDefault();
    return false;
  }
}, { passive: false });

// Disable double-tap zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    // Allow for Google Ads
    if (e.target.closest('iframe') || e.target.closest('ins.adsbygoogle')) {
      return true;
    }
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// Add CSS to prevent selection
const style = document.createElement('style');
style.textContent = `
  * {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  
  input, textarea {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
  }
  
  /* Allow selection for Google Ads */
  iframe[src*="googlesyndication"],
  ins.adsbygoogle,
  ins.adsbygoogle * {
    -webkit-user-select: auto !important;
    -moz-user-select: auto !important;
    -ms-user-select: auto !important;
    user-select: auto !important;
    -webkit-touch-callout: default !important;
  }
`;
document.head.appendChild(style);

// Disable "view source" by preventing Ctrl+U
document.onkeydown = function(e) {
  if (e.ctrlKey && e.keyCode === 'U'.charCodeAt(0)) {
    return false;
  }
};

// Disable screenshot on some browsers (limited support)
document.addEventListener('keyup', function(e) {
  if (e.key === 'PrintScreen') {
    navigator.clipboard.writeText('');
    alert('Screenshots are disabled for content protection.');
  }
});

console.log('Content protection enabled - Google Ads exceptions allowed');
