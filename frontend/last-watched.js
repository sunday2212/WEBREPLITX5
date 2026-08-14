/**
 * last-watched.js
 * Shared helper for saving and reading the last watched lecture.
 * Saves to localStorage (fast) + Supabase profiles.last_watched (persistent).
 */
(function () {
  'use strict';

  /* ── Get Supabase client: prefer existing window._supabase, else create one ── */
  function getClient() {
    if (window._supabase) return window._supabase;
    if (typeof supabase !== 'undefined' &&
        typeof SUPABASE_URL !== 'undefined' &&
        typeof SUPABASE_KEY !== 'undefined') {
      return supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return null;
  }

  /**
   * saveLastWatched(data)
   * data: { title, streamUrl, downloadUrl, thumbnailUrl, platform, subject, jsonPath, lectureIndex }
   */
  window.saveLastWatched = async function (data) {
    const payload = {
      title:        data.title        || '',
      streamUrl:    data.streamUrl    || '',
      downloadUrl:  data.downloadUrl  || '',
      thumbnailUrl: data.thumbnailUrl || '',
      platform:     data.platform     || '',
      subject:      data.subject      || '',
      jsonPath:     data.jsonPath     || '',
      lectureIndex: (data.lectureIndex != null) ? data.lectureIndex : null,
      savedAt:      new Date().toISOString()
    };

    // Always write localStorage first — instant, no network
    try { localStorage.setItem('last_watched', JSON.stringify(payload)); } catch (_) {}

    // Then persist to Supabase (silent failure is OK — localStorage is the fallback)
    try {
      const client = getClient();
      if (!client) return;

      const { data: { session } } = await client.auth.getSession();
      if (!session) return;

      await client
        .from('profiles')
        .update({ last_watched: payload })
        .eq('id', session.user.id);
    } catch (_) {}
  };

  /**
   * getLastWatched()
   * Returns the last watched object, or null.
   * Checks localStorage first (instant), then Supabase.
   */
  window.getLastWatched = async function () {
    // Immediate localStorage check
    let local = null;
    try {
      const stored = localStorage.getItem('last_watched');
      if (stored) {
        const p = JSON.parse(stored);
        if (p && p.streamUrl) local = p;
      }
    } catch (_) {}

    // Try Supabase for a fresher copy
    try {
      const client = getClient();
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        if (session) {
          const { data } = await client
            .from('profiles')
            .select('last_watched')
            .eq('id', session.user.id)
            .single();
          if (data && data.last_watched && data.last_watched.streamUrl) {
            try { localStorage.setItem('last_watched', JSON.stringify(data.last_watched)); } catch (_) {}
            return data.last_watched;
          }
        }
      }
    } catch (_) {}

    return local;
  };
})();
