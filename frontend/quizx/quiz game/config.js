// ============================================================================
// Quiz Game - Configuration
// Fill in your Supabase project details below. Until you do, the game runs in
// DEMO MODE (single machine + 3 simulated players) so you can try it instantly.
// ============================================================================

export const CONFIG = {
  // --- Supabase (from your supabase-config.js) ---
  SUPABASE_URL: 'https://txhxgmryxsebqfxoocos.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_Rp_naWKL3nPS-6nlOx1LHw_40Rc4T1M',

  // --- Game room ---
  ROOM_ID: 'main',           // change to run multiple independent rooms
  ROUND_SECONDS: 60,         // answering window
  RESULTS_SECONDS: 8,        // how long the results popup stays before next turn
  BASE_POINTS: 1000,         // max points for an instant correct answer
  MIN_CORRECT_POINTS: 100,   // floor points for a correct (but slow) answer
  SETTER_BONUS: 0,           // points the question setter gets per round

  // --- AI (question auto-generate) ---
  // Your site already stores each user's key in profiles.groq_api_key, so the
  // default provider is Groq. Users can still override in Settings.
  DEFAULT_AI_PROVIDER: 'groq',   // 'groq' | 'openai' | 'gemini'

  // --- File-based Question Bank / Bookmarks ---
  // Your bookmarks + question bank are JSON files served from your domain.
  // Base URL where those JSON files live. Empty = same origin as this page
  // (e.g. https://yourdomain.com/). file_path from quiz_bookmarks is resolved
  // relative to this. Set it if your JSONs live under a sub-path or CDN.
  QUESTION_FILE_BASE: '/quizx/Brain/',
  // URL of your file manifest / website metadata JSON that lists the question
  // bank folders + files (used to build the "Question Bank Folder" dropdown).
  // Leave empty to hide that source until configured.
  MANIFEST_URL: '/quizx/Brain/file-manifest.json',

  // --- Google AdSense (optional) ---
  // Put your publisher id like 'ca-pub-1234567890123456' to show an ad slot.
  // Leave empty to hide. Layout is auto-ads friendly (no full-screen locks).
  ADSENSE_CLIENT: '',
};

export function isSupabaseConfigured() {
  return (
    !!CONFIG.SUPABASE_URL &&
    !CONFIG.SUPABASE_URL.includes('YOUR_') &&
    !!CONFIG.SUPABASE_ANON_KEY &&
    !CONFIG.SUPABASE_ANON_KEY.includes('YOUR_')
  );
}

export const DEMO_MODE =
  (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo'))
  || !isSupabaseConfigured();
