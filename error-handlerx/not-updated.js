// Not Updated Page JavaScript Functionality

// Function to go back to previous page
function goBack() {
  // Check if there's a history to go back to
  if (window.history.length > 1) {
    window.history.back();
  } else {
    // If no history, go to home page
    goHome();
  }
}

// Function to go to home page
function goHome() {
  window.location.href = '../app.html';
}

// Function to redirect to not-updated page when a link is broken
function handleBrokenLink(targetUrl) {
  // Store the intended URL for potential future use
  localStorage.setItem('intendedUrl', targetUrl);
  
  // Redirect to not-updated page
  window.location.href = '../error-handler/not-updated.html';
}

// Global error handler for broken links
window.addEventListener('error', function(e) {
  // Check if it's a resource loading error
  if (e.target && (e.target.tagName === 'A' || e.target.href)) {
    e.preventDefault();
    handleBrokenLink(e.target.href);
  }
});

// Function to check if a page exists before navigating
async function checkPageExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Enhanced navigation function that checks page existence
async function safeNavigate(url) {
  const pageExists = await checkPageExists(url);
  
  if (pageExists) {
    window.location.href = url;
  } else {
    handleBrokenLink(url);
  }
}

// Initialize page with fade-in animation
document.addEventListener('DOMContentLoaded', function() {
  // Add fade-in animation to content
  const content = document.querySelector('.not-updated-content');
  if (content) {
    content.style.opacity = '0';
    content.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      content.style.transition = 'all 0.5s ease';
      content.style.opacity = '1';
      content.style.transform = 'translateY(0)';
    }, 100);
  }
  
  // Log the intended URL if it exists
  const intendedUrl = localStorage.getItem('intendedUrl');
  if (intendedUrl) {
    console.log('User was trying to access:', intendedUrl);
    // Clear the stored URL
    localStorage.removeItem('intendedUrl');
  }
});