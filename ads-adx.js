/**
 * ============================================================
 * ads-adx.js — ADX / GAM MCM | Afrahtafreeh PWA
 * ============================================================
 * 
 * COVERS: 
 * 1. Anchor (Bottom Overlay)
 * 2. Vignette (Interstitial Overlay)
 * 3. Automatic Funding Choices (Consent Management)
 * 
 * ============================================================ */

(function () {

    // 1. CONFIGURATION
    var NETWORK = '23205238319';

    var UNITS = {
        anchor: '/' + NETWORK + '/anchor_bottom1',
        vignette: '/' + NETWORK + '/vignette_inter1'
    };

    // Slot IDs from your generated tags
    var SLOT_IDS = {
        anchor: 'div-gpt-ad-1785406537192-0',
        vignette: 'div-gpt-ad-1785408324695-0'
    };

    // 2. SETUP NAMESPACE
    var gt = window.googletag = window.googletag || { cmd: [] };

    // 3. LOAD FUNDING CHOICES (Consent Message)
    // This is required for ads to show in many regions.
    if (!document.querySelector('script[src*="fundingchoicesmessages"]')) {
        var fc = document.createElement('script');
        fc.async = true;
        fc.src = 'https://fundingchoicesmessages.google.com/i/pub-5920367457745298?ers=1';
        var head = document.getElementsByTagName('head')[0];
        head.appendChild(fc);
    }

    // 4. LOAD GPT LIBRARY (Google Publisher Tag)
    if (!document.querySelector('script[src*="gpt.js"]')) {
        var gads = document.createElement('script');
        gads.async = true;
        gads.crossOrigin = "anonymous";
        gads.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
        var node = document.getElementsByTagName('script')[0];
        node.parentNode.insertBefore(gads, node);
    }

    // 5. INITIALIZE ADS
    gt.cmd.push(function () {

        // --- Define Anchor (Bottom) ---
        // We use defineOutOfPageSlot to ensure it floats at the bottom
        var anchorSlot = gt.defineOutOfPageSlot(UNITS.anchor, gt.enums.OutOfPageFormat.BOTTOM_ANCHOR);
        if (anchorSlot) {
            anchorSlot.addService(gt.pubads());
        }

        // --- Define Vignette (Interstitial) ---
        // We use defineOutOfPageSlot to ensure it triggers between page loads
        var vignetteSlot = gt.defineOutOfPageSlot(UNITS.vignette, gt.enums.OutOfPageFormat.INTERSTITIAL);
        if (vignetteSlot) {
            vignetteSlot.addService(gt.pubads());
        }

        // Global Ad Manager Settings
        gt.pubads().enableSingleRequest();
        gt.pubads().collapseEmptyDivs();
        gt.enableServices();

        /**
         * 6. TRIGGER DISPLAY
         * For Out-Of-Page slots (Anchor/Vignette), we must call display 
         * using the slot object itself to register it correctly in the console.
         */
        gt.display(anchorSlot);
        gt.display(vignetteSlot);
    });

    // 7. SPA/PWA ROUTE CHANGE HELPER
    // Call window.adxRefresh() whenever the user changes pages in your PWA
    window.adxRefresh = function () {
        gt.cmd.push(function () {
            gt.pubads().refresh();
        });
    };

})();
