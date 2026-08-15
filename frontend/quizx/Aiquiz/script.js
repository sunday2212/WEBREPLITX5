import { QuizUI } from './js/ui.js';
const { loadAISettings, saveAISettings, getCachedAISettings, providerOptions, PROVIDERS } =
    window.AIKeyManager;

// Utility function for custom popup
function showPopup(message) {
    const popup = document.getElementById('custom-popup');
    const popupMessage = document.getElementById('popup-message');
    popupMessage.textContent = message;
    popup.classList.remove('hidden');

    const closeBtn = document.getElementById('popup-close');
    closeBtn.onclick = () => {
        popup.classList.add('hidden');
    };
}

// Initialize the quiz application
document.addEventListener('DOMContentLoaded', async () => {
    const quizUI = new QuizUI();

    // Handle API key setup
    const saveApiKeysBtn = document.getElementById('save-api-keys');
    const apiKeyInput = document.getElementById('ai-api-key');
    const providerInput = document.getElementById('ai-provider');

    // Load the same Supabase-backed provider/key settings used everywhere else.
    const settings = await loadAISettings(true);
    providerInput.innerHTML = providerOptions(settings.provider);
    const syncInput = () => {
        const provider = providerInput.value;
        const key = getCachedAISettings().keys[provider] || '';
        apiKeyInput.value = '';
        apiKeyInput.placeholder = `Enter ${PROVIDERS[provider].label} API key (${PROVIDERS[provider].placeholder})`;
        apiKeyInput.dataset.hasSavedKey = key ? 'true' : 'false';
    };
    providerInput.addEventListener('change', syncInput);
    syncInput();

    if (saveApiKeysBtn) {
        saveApiKeysBtn.addEventListener('click', async () => {
            const provider = providerInput.value;
            const key = apiKeyInput.value.trim();

            if (key) {
                try {
                    await saveAISettings(provider, key);
                    apiKeyInput.value = '';
                    syncInput();
                    showPopup(`${PROVIDERS[provider].label} key saved and shared across the site!`);
                } catch (e) {
                    showPopup('Could not save API key: ' + e.message);
                }
            } else {
                showPopup(`Enter your ${PROVIDERS[provider].label} API key.`);
            }
        });
    }
});
