const { getCachedAISettings, callAI, PROVIDERS } = window.AIKeyManager;

const PROVIDER_ORDER = ['groq', 'gemini', 'openai'];

// Ordered list of providers to actually use for a request:
// the user's SELECTED provider first, then every other provider they have
// saved an API key for. This is what powers the automatic fallback.
export function getProviderOrder() {
    const settings = getCachedAISettings();
    const selected = settings.provider;
    const keys = settings.keys || {};
    return [selected, ...PROVIDER_ORDER.filter(p => p !== selected)]
        .filter((p, i, arr) => arr.indexOf(p) === i)                 // dedupe
        .filter(p => PROVIDERS[p] && String(keys[p] || '').trim());  // only ones with a key
}

// Call ONE specific provider directly (used by the fallback loops).
export async function fetchFromAPIWith(provider, prompt, options = {}) {
    const settings = getCachedAISettings();
    const apiKey = String((settings.keys || {})[provider] || '').trim();
    if (!apiKey) {
        throw new Error(`${PROVIDERS[provider]?.label || provider} API key not found.`);
    }
    return await callAI(provider, apiKey, prompt, { temperature: 0.9, maxTokens: 1500, ...options });
}

// Generic call: tries each available provider in order and returns the first
// non-empty answer. Used for explanations / doubt answers (any non-JSON call),
// so those also fall back automatically when the primary provider fails.
export async function fetchFromAPI(prompt, options = {}) {
    const order = getProviderOrder();
    if (order.length === 0) {
        const selected = getCachedAISettings().provider;
        throw new Error(`${PROVIDERS[selected]?.label || 'AI'} API key not found. Please set your API key first.`);
    }

    const selected = order[0];
    const errors = [];
    for (const provider of order) {
        try {
            const result = await fetchFromAPIWith(provider, prompt, options);
            if (result && String(result).trim()) {
                if (provider !== selected) {
                    console.warn(`Primary provider failed; answered using fallback "${PROVIDERS[provider].label}".`);
                }
                return result;
            }
            errors.push(`${PROVIDERS[provider].label}: empty response`);
        } catch (error) {
            const msg = error && error.message ? error.message : String(error);
            console.warn(`Provider "${PROVIDERS[provider].label}" failed: ${msg}`);
            errors.push(`${PROVIDERS[provider].label}: ${msg}`);
        }
    }
    throw new Error(`All available AI providers failed. ${errors.join(' | ')}`);
}
