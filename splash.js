// splash.js - Enhanced Version
document.addEventListener('DOMContentLoaded', function() {
    // Detect device type for optimized experience
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Android|Tablet/i.test(navigator.userAgent) && !isMobile;
    
    // Adjust loading text based on device
    const loadingText = document.querySelector('.loading-text');
    if (isMobile) {
        loadingText.textContent = "Loading mobile experience...";
    } else if (isTablet) {
        loadingText.textContent = "Loading tablet experience...";
    } else {
        loadingText.textContent = "Loading desktop experience...";
    }
    
    // Handle splash screen sequence
    setTimeout(function() {
        loadingText.textContent = "Initialization complete!";
        
        setTimeout(function() {
            const splashContainer = document.querySelector('.splash-container');
            splashContainer.style.transition = 'opacity 0.5s ease-in-out';
            splashContainer.style.opacity = '0';
            
            setTimeout(function() {
                splashContainer.style.display = 'none';
                document.querySelector('.main-content').style.display = 'block';
                
                // Force redraw for some mobile browsers
                document.body.clientWidth;
                
                // Additional initialization can go here
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('./sw.js')
                        .then(reg => console.log('Service Worker registered'))
                        .catch(err => console.log('Service Worker registration failed: ', err));
                }
            }, 500);
        }, 1500);
    }, 3000);
    
    // Handle orientation changes
    window.addEventListener('orientationchange', function() {
        // Refresh splash screen on orientation change
        document.body.clientWidth;
    });
});
