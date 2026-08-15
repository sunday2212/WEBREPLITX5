import { QuizUI } from './js/ui.js';
    const { loadAISettings, saveAISettings, getCachedAISettings, providerOptions, modelOptions, PROVIDERS } =
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
    const modelInput = document.getElementById('ai-model');
    const modelHelp = document.getElementById('ai-model-help');
    const getApiKey = document.getElementById('get-api-key');
    const apiKeyNote = document.getElementById('api-key-note');

    // Load the same Supabase-backed provider/key settings used everywhere else.
    const settings = await loadAISettings(true);
    providerInput.innerHTML = providerOptions(settings.provider);
    const syncInput = () => {
        const provider = providerInput.value;
        const cached = getCachedAISettings();
        const providerInfo = PROVIDERS[provider];
        modelInput.innerHTML = modelOptions(provider, cached.model);
        const selectedModel = modelInput.value;
        modelHelp.textContent = providerInfo.models.find(item => item.id === selectedModel)?.badge || '';
        getApiKey.href = `api-key-guide.html?provider=${encodeURIComponent(provider)}`;
        getApiKey.setAttribute('aria-label', `How to get a ${providerInfo.label} API key`);
        apiKeyNote.textContent = provider === 'openai'
            ? 'OpenAI API access is billed separately; ChatGPT Plus does not include API credits.'
            : 'Free usage depends on the provider account and current rate limits.';
        const key = cached.keys[provider] || '';
        apiKeyInput.value = '';
        apiKeyInput.placeholder = `Enter ${providerInfo.label} API key (${providerInfo.placeholder})`;
        apiKeyInput.dataset.hasSavedKey = key ? 'true' : 'false';
    };
    providerInput.addEventListener('change', syncInput);
    modelInput.addEventListener('change', () => {
        const providerInfo = PROVIDERS[providerInput.value];
        modelHelp.textContent = providerInfo.models.find(item => item.id === modelInput.value)?.badge || '';
    });
    syncInput();

    if (saveApiKeysBtn) {
        saveApiKeysBtn.addEventListener('click', async () => {
            const provider = providerInput.value;
            const key = apiKeyInput.value.trim();
            const model = modelInput.value;

            if (key) {
                try {
                    await saveAISettings(provider, key, model);
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
