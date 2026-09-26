const SUPABASE_URL  = 'https://supabase.afrahtafreeh.site';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCIsCiAgICAiZXhwIjogMTc5OTUzNTYwMAp9.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const VPS_API       = 'https://api.afrahtafreeh.site';

// Expose the same public configuration to shared modules loaded by pages
// that do not have their own inline Supabase bootstrap.
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_KEY = SUPABASE_KEY;
