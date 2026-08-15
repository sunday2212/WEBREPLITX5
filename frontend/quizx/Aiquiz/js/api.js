const { getCachedAISettings, callAI, PROVIDERS } = window.AIKeyManager;

export async function fetchFromAPI(prompt) {
    const settings = getCachedAISettings();
    const provider = settings.provider;
    const apiKey = settings.keys[provider] || '';
    if (!apiKey) {
        throw new Error(`${PROVIDERS[provider].label} API key not found. Please set your API key first.`);
    }
    try {
        return await callAI(provider, apiKey, prompt, { temperature: 0.9, maxTokens: 1500 });
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
