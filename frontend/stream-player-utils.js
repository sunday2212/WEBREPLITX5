/**
 * Stream Player Utilities
 * Replaces Stream/Download buttons with a single "Open" button
 * that redirects to the new stream-player.html with reCAPTCHA verification
 */

// Function to extract platform path and subject from current page URL and context
// Returns: { platformPath: 'dams/damsb2benglish', subject: 'anatomy' }
// This allows handling nested subfolders like 1234xx/dams/damsb2benglish/anatomy.html
function extractPageContext() {
    let platformPath = '';
    let subject = '';
    
    // Method 1: Check if there's a global variable defined on the page (optional)
    if (window.PAGE_CONTEXT) {
        platformPath = window.PAGE_CONTEXT.platformPath || window.PAGE_CONTEXT.platform || '';
        subject = window.PAGE_CONTEXT.subject || '';
        if (platformPath && subject) return { platformPath, subject };
    }
    
    // Method 2: Extract from current URL path
    const currentPath = window.location.pathname;
    
    // Find the position of '1234xx/' in the path
    const match = currentPath.match(/1234xxx\/(.+)\.html$/);
    if (match) {
        const fullPath = match[1]; // e.g., 'dams/damsb2benglish/anatomy'
        const pathParts = fullPath.split('/');
        
        // Last part is the subject (filename without .html)
        subject = pathParts[pathParts.length - 1];
        
        // Everything before the last part is the platform path (can include subfolders)
        // e.g., 'dams/damsb2benglish' or just 'test3'
        platformPath = pathParts.slice(0, -1).join('/');
        
        if (platformPath && subject) return { platformPath, subject };
    }
    
    return { platformPath, subject };
}

// Function to open the stream player with reCAPTCHA verification
// jsonFileInfo is an optional object: { jsonPath: 'test3/clinicalguruji.json', platform: 'test3', subject: 'clinicalguruji', streamUrlX: '...', downloadUrlX: '...' }
function openStreamPlayer(streamUrl, downloadUrl, title, platform, subject, jsonFileInfo) {
    console.log('===== openStreamPlayer called =====');
    console.log('Parameters received:', { streamUrl, downloadUrl, title, platform, subject, jsonFileInfo });
    
    if (!streamUrl) {
        alert('Stream URL not available');
        return;
    }

    // Sanitize and encode the title properly to handle special characters
    // Remove any potentially problematic characters and ensure proper encoding
    const sanitizedTitle = (title || 'Lecture Video').trim();
    
    // Build the URL with parameters - URLSearchParams automatically encodes special characters
    const params = new URLSearchParams({
        stream: streamUrl,
        title: sanitizedTitle
    });

    // Add download URL if available
    if (downloadUrl) {
        params.append('download', downloadUrl);
    }
    
    // Add Server 2 URLs if available (streamingUrlx and downloadUrlx)
    if (jsonFileInfo && jsonFileInfo.streamUrlX) {
        params.append('streamx', jsonFileInfo.streamUrlX);
    }
    if (jsonFileInfo && jsonFileInfo.downloadUrlX) {
        params.append('downloadx', jsonFileInfo.downloadUrlX);
    }
    
    // Method 1: Use explicit jsonFileInfo if provided (most reliable)
    if (jsonFileInfo && jsonFileInfo.jsonPath) {
        console.log('Using jsonFileInfo:', jsonFileInfo);
        params.append('jsonPath', jsonFileInfo.jsonPath);
        
        // Also pass the lecture index if available (helps avoid title matching issues)
        if (typeof jsonFileInfo.lectureIndex === 'number') {
            console.log('Adding lectureIndex:', jsonFileInfo.lectureIndex);
            params.append('lectureIndex', jsonFileInfo.lectureIndex.toString());
        }
    } else {
        console.log('No jsonFileInfo provided, trying platformPath/subject fallback');
        // Method 2: Extract platformPath and subject from page context (fallback)
        // Note: For backward compatibility, we support both 'platform' and 'platformPath'
        let platformPath = platform; // platform parameter can be full path
        if (!platformPath || !subject) {
            const context = extractPageContext();
            platformPath = platformPath || context.platformPath;
            subject = subject || context.subject;
        }
        
        // Add platformPath and subject if available (needed for "next lectures" feature)
        // platformPath can be 'test3' or 'dams/damsb2benglish' depending on folder structure
        if (platformPath) {
            params.append('platformPath', platformPath);
        }
        if (subject) {
            params.append('subject', subject);
        }
    }

    // Open in the same window/tab
    // Smart path detection that works for both GitHub Pages (with repo name) and custom domains
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/').filter(p => p && !p.includes('.html'));
    
    // Detect if we're on GitHub Pages without custom domain
    // GitHub Pages URLs: username.github.io/repo-name/...
    // Custom domain URLs: customdomain.com/...
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    let streamPlayerUrl;
    if (isGitHubPages && pathParts.length > 0) {
        // GitHub Pages without custom domain - include repo name
        // e.g., /repo-name/stream-player.html
        const repoName = pathParts[0];
        streamPlayerUrl = `/${repoName}/stream-player.html?${params.toString()}`;
    } else {
        // Custom domain or root level - use absolute path from root
        // e.g., /stream-player.html
        streamPlayerUrl = `/stream-player.html?${params.toString()}`;
    }
    
    window.location.href = streamPlayerUrl;
}

// Function to replace Stream/Download buttons with Open button
function replaceStreamDownloadButtons(container) {
    // Find all lecture cards in the container
    const lectureCards = container ? 
        container.querySelectorAll('.lecture-card') : 
        document.querySelectorAll('.lecture-card');

    // Extract page context once (for JSON path construction)
    // This works automatically for ANY HTML file based on its URL path
    const pageContext = extractPageContext();
    console.log('Page context extracted:', pageContext);

    lectureCards.forEach((card, index) => {
        const buttonContainer = card.querySelector('.button-container');
        if (!buttonContainer) return;

        const streamBtn = buttonContainer.querySelector('.stream-button');
        const downloadBtn = buttonContainer.querySelector('.download-button');

        if (!streamBtn) return;

        // Get URLs from onclick attributes
        const streamUrl = extractUrlFromOnclick(streamBtn.getAttribute('onclick'), 'openVideo');
        const downloadUrl = downloadBtn ? 
            extractUrlFromOnclick(downloadBtn.getAttribute('onclick'), 'openVideo') : null;

        // Skip if we couldn't extract the stream URL
        if (!streamUrl) {
            console.warn('Could not extract stream URL from button:', streamBtn);
            return;
        }

        // Get title from card
        const titleElement = card.querySelector('h3');
        const title = titleElement ? titleElement.textContent.trim() : 'Lecture Video';

        // Create new Open button
        const openBtn = document.createElement('button');
        openBtn.className = 'open-button';
        openBtn.innerHTML = '<i class="fas fa-play-circle"></i> Open';
        
        // Use arrow function to ensure proper context and handle special characters in title
        openBtn.onclick = (e) => {
            e.preventDefault();
            
            // Dynamically build jsonFileInfo from page context (NO HARDCODING NEEDED)
            // Works for ALL HTML files automatically
            const jsonFileInfo = {
                jsonPath: `${pageContext.platformPath}/${pageContext.subject}.json`,
                platform: pageContext.platformPath,
                subject: pageContext.subject,
                lectureIndex: index  // Pass the card index as lecture index
            };
            
            console.log('Opening stream with jsonFileInfo:', jsonFileInfo);
            
            // Call with full context including jsonFileInfo
            openStreamPlayer(
                streamUrl, 
                downloadUrl, 
                title, 
                pageContext.platformPath, 
                pageContext.subject, 
                jsonFileInfo
            );
        };

        // Replace button container content
        buttonContainer.innerHTML = '';
        buttonContainer.appendChild(openBtn);
    });
}

// Helper function to extract URL from onclick attribute
function extractUrlFromOnclick(onclickStr, functionName) {
    if (!onclickStr) return null;
    
    // Try multiple function names since different pages use different function names
    const functionNames = [functionName, 'openVideo', 'openPopup', 'openStreamPlayer'];
    
    for (const fname of functionNames) {
        // Match pattern: functionName('url', ...) or functionName("url", ...)
        // Enhanced regex that handles escaped quotes, backslashes, and special characters
        // Pattern explanation:
        // - (?:[^'\\]|\\.)* means: match any character except quote or backslash, OR backslash followed by any character
        // This properly handles escaped quotes like \' or \" and other escaped characters
        const patterns = [
            // Single quotes with escaped character support: functionName('url with \'quotes\'', ...)
            new RegExp(`${fname}\\s*\\(\\s*'((?:[^'\\\\]|\\\\.)*)'`),
            // Double quotes with escaped character support: functionName("url with \"quotes\"", ...)
            new RegExp(`${fname}\\s*\\(\\s*"((?:[^"\\\\]|\\\\.)*)"`),
        ];
        
        for (const regex of patterns) {
            const match = onclickStr.match(regex);
            if (match && match[1]) {
                // Unescape the captured string (remove backslashes before quotes)
                // This converts \' to ' and \" to "
                const unescaped = match[1].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                return unescaped;
            }
        }
    }
    
    return null;
}

// Open a PDF through the stream-player verification flow
function openPdfInPlayer(pdfUrl, pdfUrlX, title) {
    if (!pdfUrl) {
        alert('PDF download URL not available');
        return;
    }
    const params = new URLSearchParams({
        type: 'pdf',
        stream: pdfUrl,
        download: pdfUrl,
        title: (title || 'PDF Document').trim()
    });
    if (pdfUrlX) params.append('downloadx', pdfUrlX);

    const isGitHubPages = window.location.hostname.includes('github.io');
    let url;
    if (isGitHubPages) {
        const repoName = window.location.pathname.split('/').filter(p => p && !p.includes('.html'))[0];
        url = `/${repoName}/stream-player.html?${params.toString()}`;
    } else {
        url = `/stream-player.html?${params.toString()}`;
    }
    window.location.href = url;
}

// Post-process rendered lecture cards to handle PDF items
function postProcessPdfCards(lectures) {
    const lectureList = document.getElementById('lectureList');
    if (!lectureList) return;
    const cards = lectureList.querySelectorAll('.lecture-card');

    lectures.forEach((lecture, index) => {
        if (!lecture.pdf_downloadUrl) return;
        const card = cards[index];
        if (!card) return;

        // Mark card as PDF
        card.classList.add('pdf-card');

        // Replace button container
        const btnContainer = card.querySelector('.button-container');
        if (btnContainer) {
            btnContainer.innerHTML = '';
            const dlBtn = document.createElement('button');
            dlBtn.className = 'open-button pdf-download-btn';
            dlBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Download PDF';
            dlBtn.addEventListener('click', function () {
                openPdfInPlayer(lecture.pdf_downloadUrl, lecture.pdf_downloadUrlx, lecture.title);
            });
            btnContainer.appendChild(dlBtn);
        }

        // Remove completion toggle (not applicable for PDFs)
        const toggle = card.querySelector('.completion-toggle');
        if (toggle) toggle.remove();
    });
}

// Add CSS for Open button (matching existing theme)
function addOpenButtonStyles() {
    if (document.getElementById('open-button-styles')) return;

    const style = document.createElement('style');
    style.id = 'open-button-styles';
    style.textContent = `
        .open-button {
            background: #2c5282;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(44, 130, 82, 0.3);
        }

        .open-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(44, 130, 82, 0.4);
        }

        .open-button:active {
            transform: translateY(0);
        }

        .open-button i {
            font-size: 1.1rem;
        }

        /* PDF card — subtle amber tint in light mode */
        .lecture-card.pdf-card {
            background: #fffaf4 !important;
            border-left: 4px solid #e67e22 !important;
        }

        .pdf-download-btn {
            background: #e67e22 !important;
            box-shadow: 0 4px 12px rgba(230, 126, 34, 0.3) !important;
        }

        .pdf-download-btn:hover {
            background: #cf6d17 !important;
            box-shadow: 0 6px 20px rgba(230, 126, 34, 0.4) !important;
        }

        /* Dark mode PDF card */
        html:not([data-theme="light"]) .lecture-card.pdf-card {
            background: #1e1a12 !important;
            border-left: 4px solid #c0621a !important;
        }

        @media (max-width: 768px) {
            .open-button {
                width: 100%;
                justify-content: center;
            }
        }
    `;
    document.head.appendChild(style);
}

// Wrap the page's renderLectures to post-process PDF items after rendering.
// stream-player-utils.js loads synchronously AFTER the inline <script> that
// defines renderLectures, so window.renderLectures is already available here.
(function patchRenderLectures() {
    const orig = window.renderLectures;
    if (typeof orig !== 'function') return;
    window.renderLectures = function (lectures) {
        orig.call(this, lectures);
        postProcessPdfCards(lectures);
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        addOpenButtonStyles();
        replaceStreamDownloadButtons();
    });
} else {
    addOpenButtonStyles();
    replaceStreamDownloadButtons();
}

// Export for manual use
window.StreamPlayerUtils = {
    openStreamPlayer,
    openPdfInPlayer,
    replaceStreamDownloadButtons,
    addOpenButtonStyles
};
