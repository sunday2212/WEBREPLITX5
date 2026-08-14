// ============================================================================
// Quiz Game - Configuration
// Fill in your Supabase project details below. Until you do, the game runs in
// DEMO MODE (single machine + 3 simulated players) so you can try it instantly.
// ============================================================================

export const CONFIG = {
  // --- Supabase (get these from Supabase Dashboard -> Project Settings -> API) ---
  SUPABASE_URL: 'YOUR_SUPABASE_URL_HERE',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_HERE',

  // --- Game room ---
  ROOM_ID: 'main',           // change to run multiple independent rooms
  ROUND_SECONDS: 60,         // answering window
  RESULTS_SECONDS: 8,        // how long the results popup stays before next turn
  BASE_POINTS: 1000,         // max points for an instant correct answer
  MIN_CORRECT_POINTS: 100,   // floor points for a correct (but slow) answer
  SETTER_BONUS: 0,           // points the question setter gets per round

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

export const DEMO_MODE = !isSupabaseConfigured();
