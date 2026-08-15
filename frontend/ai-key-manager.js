/* Shared AI provider/key storage for the profile, AI Question Bank,
   Brain doubt solver, and Quiz Battle.

   The legacy profiles.groq_api_key column is intentionally kept intact.
   New installs can add gemini_api_key, openai_api_key and ai_provider to
   profiles (see quizx/quiz game/schema.sql). Auth user metadata is also used
   as a schema-safe persistence fallback, so existing profiles do not lose
   their Groq key while the migration is being applied.

   NOTE (Aug 2026): all three previous default model IDs had been retired
   by their providers, which is why "AI Fix / Fill" was returning 404s:
     - Gemini:  gemini-2.5-flash      -> blocked for existing/new keys ahead
                                          of its Oct 16, 2026 shutdown
     - Groq:    llama-3.3-70b-versatile -> deprecated June 17, 2026
     - OpenAI:  gpt-4.1-mini          -> being retired across Azure/API,
                                          OpenAI is consolidating on GPT-5.x
   Defaults below have been updated to each provider's current recommended
   replacement. If you see a 404 "model not found" again in the future,
   it almost always means the provider retired this ID too — check the
   provider's docs and swap the `id` value in PROVIDERS[...].models below.
*/
(function () {
  'use strict';

  const PROVIDERS = {
    gemini: {
      label: 'Google Gemini',
      shortLabel: 'Gemini',
      placeholder: 'AIza…',
      guide: 'Google AI Studio',
      guideUrl: 'https://aistudio.google.com/app/apikey',
      // Single fixed model per provider (model picker removed from the UI).
      models: [
        { id: 'gemini-flash-latest', label: 'Gemini Flash (latest)', badge: 'Fast · free tier · auto-tracks current GA model' },
      ],
    },
    groq: {
      label: 'Groq AI',
      shortLabel: 'Groq',
      placeholder: 'gsk_…',
      guide: 'Groq Cloud',
      guideUrl: 'https://console.groq.com/keys',
      models: [
        { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', badge: 'Fast · high free limit · Groq\'s recommended replacement for Llama 3.3 70B' },
      ],
    },
    openai: {
      label: 'ChatGPT (OpenAI)',
      shortLabel: 'ChatGPT',
      placeholder: 'sk-…',
      guide: 'OpenAI Platform',
      guideUrl: 'https://platform.openai.com/api-keys',
      models: [
        { id: 'gpt-5-mini', label: 'GPT-5 mini', badge: 'Fast · low cost · current-gen replacement for GPT-4.1 mini' },
      ],
    },
  };
  const DEFAULT_PROVIDER = 'gemini';
  const CACHE_KEY = 'aiProviderSettings';
  let cachedClient = null;

  function normalizeProvider(provider) {
    return PROVIDERS[provider] ? provider : DEFAULT_PROVIDER;
  }

  function normalizeModel(provider, model) {
    const models = PROVIDERS[normalizeProvider(provider)].models;
    return models.some(item => item.id === model) ? model : models[0].id;
  }

  function readLocal() {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; } catch (_) {}
    const keys = { ...(stored.keys || {}) };
    // Keep the old localStorage key as a fallback for existing users.
    if (!keys.groq && localStorage.getItem('groqApiKey')) {
      keys.groq = localStorage.getItem('groqApiKey');
    }
    return {
      provider: normalizeProvider(stored.provider || localStorage.getItem('aiProvider') ||
        localStorage.getItem('qg_provider')),
      model: normalizeModel(
        stored.provider || localStorage.getItem('aiProvider') || localStorage.getItem('qg_provider'),
        stored.model
      ),
      keys,
    };
  }

  function cache(settings) {
    const value = {
      provider: normalizeProvider(settings.provider),
      model: normalizeModel(settings.provider, settings.model),
      keys: { ...(settings.keys || {}) },
    };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(value));
      localStorage.setItem('aiProvider', value.provider);
      localStorage.setItem('aiModel', value.model);
      // Quiz Battle's existing local cache uses this name.
      localStorage.setItem('qg_provider', value.provider);
      if (value.keys.groq) localStorage.setItem('groqApiKey', value.keys.groq);
    } catch (_) {}
    return value;
  }

  function client() {
    if (cachedClient) return cachedClient;
    if (window._supabase) return window._supabase;
    if (window.supabase && window.SUPABASE_URL && window.SUPABASE_KEY) {
      cachedClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
      return cachedClient;
    }
    return null;
  }

  async function currentUser() {
    const sb = client();
    if (!sb) return null;
    try {
      const { data } = await sb.auth.getSession();
      return data && data.session ? data.session.user : null;
    } catch (_) {
      return null;
    }
  }

  async function loadAISettings(refresh = true) {
    let settings = readLocal();
    if (!refresh) return settings;

    const sb = client();
    const user = await currentUser();
    if (!sb || !user) return settings;

    try {
      const { data: profile } = await sb.from('profiles')
        .select('*').eq('id', user.id).maybeSingle();
      const metadata = user.user_metadata || {};
      const metadataKeys = metadata.ai_api_keys && typeof metadata.ai_api_keys === 'object'
        ? metadata.ai_api_keys : {};

      // Only replace local values with non-empty persisted values. This is
      // important for preserving an existing Groq key on older profile rows.
      settings.keys = {
        ...settings.keys,
        ...metadataKeys,
        ...(profile && profile.ai_api_keys && typeof profile.ai_api_keys === 'object'
          ? profile.ai_api_keys : {}),
      };
      if (profile) {
        if (profile.groq_api_key) settings.keys.groq = profile.groq_api_key;
        if (profile.gemini_api_key) settings.keys.gemini = profile.gemini_api_key;
        if (profile.openai_api_key) settings.keys.openai = profile.openai_api_key;
        settings.provider = normalizeProvider(
          profile.ai_provider || metadata.ai_provider || settings.provider
        );
        settings.model = normalizeModel(
          settings.provider,
          profile.ai_model || metadata.ai_model || settings.model
        );
      } else {
        settings.provider = normalizeProvider(metadata.ai_provider || settings.provider);
        settings.model = normalizeModel(settings.provider, metadata.ai_model || settings.model);
      }
      return cache(settings);
    } catch (_) {
      return settings;
    }
  }

  function getCachedAISettings() {
    return readLocal();
  }

  async function saveAISettings(provider, key, model) {
    provider = normalizeProvider(provider);
    key = String(key || '').trim();
    if (!key) throw new Error('Please enter an API key.');

    // Load first so saving Gemini/OpenAI can never overwrite a legacy Groq key.
    const settings = await loadAISettings(true);
    settings.provider = provider;
    settings.model = normalizeModel(provider, model || settings.model);
    settings.keys[provider] = key;
    cache(settings);

    const sb = client();
    const user = await currentUser();
    if (!sb || !user) return settings;

    const providerColumn = `${provider}_api_key`;
    const profilePayload = {
      ai_provider: provider,
      ai_model: settings.model,
      [providerColumn]: key,
    };
    // This explicit write is deliberate: it preserves the old column and
    // makes existing Groq profile data available to all four surfaces.
    if (provider === 'groq') profilePayload.groq_api_key = key;

    let profileError = null;
    try {
      const result = await sb.from('profiles').update(profilePayload).eq('id', user.id);
      profileError = result.error || null;
      // If the new optional columns are not migrated yet, still persist Groq
      // through the known legacy column rather than failing the whole save.
      if (profileError && provider === 'groq') {
        const fallback = await sb.from('profiles')
          .update({ groq_api_key: key }).eq('id', user.id);
        profileError = fallback.error || null;
      }
    } catch (e) {
      profileError = e;
    }

    // Auth metadata is a schema-safe fallback for Gemini/OpenAI until the
    // optional profile columns are added. It never removes existing metadata.
    try {
      const existingMetadata = user.user_metadata || {};
      await sb.auth.updateUser({
        data: {
          ...existingMetadata,
          ai_provider: provider,
          ai_model: settings.model,
          ai_api_keys: { ...(existingMetadata.ai_api_keys || {}), ...settings.keys },
        },
      });
    } catch (_) {}

    if (profileError && provider !== 'groq') {
      // The key is still durable in Supabase Auth metadata and local cache.
      console.warn('AI profile columns are not migrated yet:', profileError.message || profileError);
    }
    return settings;
  }

  function providerOptions(selected) {
    selected = normalizeProvider(selected);
    return Object.entries(PROVIDERS).map(([value, item]) =>
      `<option value="${value}" ${value === selected ? 'selected' : ''}>${item.label}</option>`
    ).join('');
  }

  function modelOptions(provider, selected) {
    provider = normalizeProvider(provider);
    selected = normalizeModel(provider, selected);
    return PROVIDERS[provider].models.map(item =>
      `<option value="${item.id}" ${item.id === selected ? 'selected' : ''}>${item.label} — ${item.badge}</option>`
    ).join('');
  }

  function maskKey(key) {
    if (!key) return '';
    return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
  }

  async function callAI(provider, key, prompt, options = {}) {
    provider = normalizeProvider(provider);
    if (!key) throw new Error(`No ${PROVIDERS[provider].label} API key is saved.`);
    const temperature = options.temperature == null ? 0.7 : options.temperature;
    const maxTokens = options.maxTokens || 1200;
    const model = normalizeModel(provider, options.model || readLocal().model);
    let response;
    if (provider === 'gemini') {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
        }
      );
      if (!response.ok) throw new Error(`Google Gemini error: ${await response.text()}`);
      const data = await response.json();
      return data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    }

    const endpoint = provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) throw new Error(`${PROVIDERS[provider].label} error: ${await response.text()}`);
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  window.AIKeyManager = {
    PROVIDERS,
    DEFAULT_PROVIDER,
    normalizeProvider,
    normalizeModel,
    loadAISettings,
    getCachedAISettings,
    saveAISettings,
    providerOptions,
    modelOptions,
    maskKey,
    callAI,
  };
})();
