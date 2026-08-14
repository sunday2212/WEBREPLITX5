// Global Link Checker and Error Handler
// Include this script in all HTML pages to handle broken links

(function() {
  'use strict';

  // Configuration
  const ERROR_HANDLER_PATH = 'error-handler/not-updated.html';
  
  // Function to check if a URL exists
  async function urlExists(url) {
    try {
      // Convert relative URLs to absolute
      const absoluteUrl = new URL(url, window.location.href);
      
      // Check if it's an external URL
      if (absoluteUrl.origin !== window.location.origin) {
        return true; // Don't check external URLs
      }
      
      const response = await fetch(absoluteUrl.href, { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Function to redirect to not-updated page
  function redirectToNotUpdated(originalUrl) {
    // Store original URL for reference
    localStorage.setItem('intendedUrl', originalUrl);
    
    // Calculate correct path to error handler based on current location
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/').filter(segment => segment !== '');
    let prefix = '';
    
    // If we're in root directory, no prefix needed
    if (pathSegments.length <= 1) {
      prefix = './';
    } else {
      // For subdirectories, go up the required levels
      prefix = '../'.repeat(pathSegments.length - 1);
    }
    
    console.log('Redirecting to not-updated page from:', originalUrl);
    window.location.href = prefix + 'error-handler/not-updated.html';
  }

  // Function to handle click on links
  async function handleLinkClick(event) {
    const link = event.target.closest('a');
    if (!link || !link.href) return;

    // Skip if it's an external link
    try {
      const linkUrl = new URL(link.href);
      if (linkUrl.origin !== window.location.origin) {
        return; // Allow external links to work normally
      }
    } catch (error) {
      return;
    }

    // Skip if it's a hash link or javascript link
    if (link.href.includes('#') || link.href.startsWith('javascript:')) {
      return;
    }

    // Always prevent default navigation for internal links
    event.preventDefault();
    
    // Check if the URL exists
    const exists = await urlExists(link.href);
    
    if (exists) {
      window.location.href = link.href;
    } else {
      redirectToNotUpdated(link.href);
    }
  }

  // Function to handle programmatic navigation (window.location.href)
  function interceptNavigation() {
    const originalAssign = window.location.assign;
    const originalReplace = window.location.replace;
    
    // Override location.assign
    window.location.assign = async function(url) {
      const exists = await urlExists(url);
      if (exists) {
        originalAssign.call(this, url);
      } else {
        redirectToNotUpdated(url);
      }
    };
    
    // Override location.replace
    window.location.replace = async function(url) {
      const exists = await urlExists(url);
      if (exists) {
        originalReplace.call(this, url);
      } else {
        redirectToNotUpdated(url);
      }
    };
  }

  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Add click event listener to all links
    document.addEventListener('click', handleLinkClick);
    
    // Intercept programmatic navigation
    interceptNavigation();
    
    // Handle window.location.href assignments
    let originalHref = window.location.href;
    Object.defineProperty(window.location, 'href', {
      get: function() {
        return originalHref;
      },
      set: async function(url) {
        const exists = await urlExists(url);
        if (exists) {
          originalHref = url;
          window.location.assign(url);
        } else {
          redirectToNotUpdated(url);
        }
      }
    });
  });

  // Global error handler for unhandled navigation errors
  window.addEventListener('error', function(event) {
    if (event.target && event.target.tagName === 'A') {
      event.preventDefault();
      redirectToNotUpdated(event.target.href);
    }
  });

  // Handle unhandled promise rejections that might be from fetch errors
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && event.reason.message.includes('fetch')) {
      console.warn('Navigation error caught:', event.reason);
    }
  });

})();
