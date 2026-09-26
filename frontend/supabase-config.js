const SUPABASE_URL  = 'https://supabase.afrahtafreeh.site';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkwMzQxOTU4LCJleHAiOjIxMDU3MDE5NTh9.5WNJZ1OlWwCs6B2-1VBN-LTZUAJiicslTyu2RCdTlUA';
const VPS_API       = 'https://api.afrahtafreeh.site';

// Expose the same public configuration to shared modules loaded by pages
// that do not have their own inline Supabase bootstrap.
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_KEY = SUPABASE_KEY;
