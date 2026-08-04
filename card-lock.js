/**
 * ═══════════════════════════════════════════════════════
 *  card-lock.js  —  Selective card-level lock/unlock system
 * ═══════════════════════════════════════════════════════
 *
 *  HOW TO LOCK A CARD (add these 4 data-attributes to any card):
 *  ─────────────────────────────────────────────────────────────
 *
 *    data-lock-id="unique-id"
 *        A unique key for this item. Must match across ALL pages
 *        for the same platform/subject. E.g. "marrow-8-0"
 *
 *    data-lock-coins="1000"
 *        Number of coins shown as the unlock cost.
 *
 *    data-lock-label="Marrow 8.0"
 *        Name shown inside the unlock modal.
 *
 *    data-lock-href="./path/to/subjects.html"
 *        Page to navigate to when unlocked. Replaces onclick.
 *
 *  EXAMPLE — locked card:
 *  ───────────────────────
 *    <button
 *      data-lock-id="marrow-8-0"
 *      data-lock-coins="1000"
 *      data-lock-label="Marrow 8.0"
 *      data-lock-href="./1234xxx/marrow/subjects.html">
 *      <i class="fas fa-dna"></i>
 *      <div class="platform-name">Marrow 8.0 ★</div>
 *      <div class="platform-description">Premium — unlock with coins</div>
 *    </button>
 *
 *  HOW TO MAKE A CARD FREE (remove the lock):
 *  ────────────────────────────────────────────
 *    Simply DELETE the four data-lock-* attributes above,
 *    and add back:  onclick="window.location.href='...'"
 *
 *  CHANGING THE COIN AMOUNT:
 *  ──────────────────────────
 *    Change data-lock-coins="1000" to any number.
 */

(function () {

  /* ══════════════════════════════════
     1.  INJECT CSS (theme‑aware)
  ══════════════════════════════════ */
  const style = document.createElement('style');
  style.textContent = `
    /* ─── CSS Variables for theming ─── */
    :root {
      /* Dark theme (default) */
      --clk-locked-bg:              #1a1d2e;
      --clk-locked-border:          #2a3045;
      --clk-badge-bg:               #4a5568;
      --clk-badge-unlocked-bg:      #276749;
      --clk-coin-tag-bg:            #2d3748;
      --clk-coin-tag-text:          #f6ad55;
      --clk-coin-tag-border:        #4a5568;
      --clk-coin-tag-unlocked-bg:   #22543d;
      --clk-coin-tag-unlocked-text: #9ae6b4;
      --clk-coin-tag-unlocked-border: #276749;
      --clk-modal-bg:               #1a1d2e;
      --clk-modal-text:             #e2e8f0;
      --clk-modal-muted:            #8892a4;
      --clk-modal-border:           #2a3045;
      --clk-input-bg:               #252b3b;
      --clk-input-border:           #2a3045;
      --clk-input-text:             #e2e8f0;
      --clk-close-color:            #a0aec0;
      --clk-coin-color:             #f6ad55;
    }

    /* Light theme override */
    [data-theme="light"] {
      --clk-locked-bg:              #edf2f7;
      --clk-locked-border:          #a0aec0;
      --clk-badge-bg:               #718096;
      --clk-badge-unlocked-bg:      #38a169;
      --clk-coin-tag-bg:            #fff5f5;
      --clk-coin-tag-text:          #e53e3e;
      --clk-coin-tag-border:        #fed7d7;
      --clk-coin-tag-unlocked-bg:   #c6f6d5;
      --clk-coin-tag-unlocked-text: #276749;
      --clk-coin-tag-unlocked-border: #9ae6b4;
      --clk-modal-bg:               #ffffff;
      --clk-modal-text:             #1a202c;
      --clk-modal-muted:            #718096;
      --clk-modal-border:           #e2e8f0;
      --clk-input-bg:               #f7fafc;
      --clk-input-border:           #e2e8f0;
      --clk-input-text:             #2d3748;
      --clk-close-color:            #718096;
      --clk-coin-color:             #f6ad55;
    }

    /* ─── Card styles ─── */
    [data-lock-id] { position: relative !important; }

    [data-lock-id].clk-locked {
      background: var(--clk-locked-bg) !important;
      border: 2px dashed var(--clk-locked-border) !important;
      box-shadow: none !important;
      filter: grayscale(25%);
      cursor: pointer;
    }

    .clk-lock-badge {
      position: absolute;
      top: 7px; right: 7px;
      width: 26px; height: 26px;
      border-radius: 50%;
      background: var(--clk-badge-bg);
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.72rem;
      z-index: 2;
      pointer-events: none;
    }
    [data-lock-id].clk-unlocked-user .clk-lock-badge {
      background: var(--clk-badge-unlocked-bg);
    }

    .clk-coin-tag {
      display: inline-block;
      background: var(--clk-coin-tag-bg);
      color: var(--clk-coin-tag-text);
      font-size: 0.73rem;
      font-weight: 700;
      border-radius: 20px;
      padding: 2px 9px;
      border: 1px solid var(--clk-coin-tag-border);
      margin-top: 5px;
      pointer-events: none;
    }
    [data-lock-id].clk-unlocked-user .clk-coin-tag {
      background: var(--clk-coin-tag-unlocked-bg);
      color: var(--clk-coin-tag-unlocked-text);
      border-color: var(--clk-coin-tag-unlocked-border);
    }

    /* ─── Modal ─── */
    #clk-modal {
      display: none;
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.65);
      align-items: center; justify-content: center;
      padding: 16px;
      backdrop-filter: blur(3px);
    }
    #clk-modal.open { display: flex; }

    .clk-modal-box {
      background: var(--clk-modal-bg);
      color: var(--clk-modal-text);
      border-radius: 20px;
      width: 100%; max-width: 420px;
      padding: 2rem 1.8rem;
      box-shadow: 0 24px 60px rgba(0,0,0,0.3);
      position: relative;
      animation: clkRise 0.28s ease;
      text-align: center;
    }
    @keyframes clkRise {
      from { transform: translateY(24px); opacity:0 }
      to   { transform: translateY(0);    opacity:1 }
    }
    .clk-modal-close {
      position: absolute; top:14px; right:16px;
      background:none; border:none;
      font-size:1.3rem; color:var(--clk-close-color);
      cursor:pointer; line-height:1;
    }
    .clk-modal-title {
      font-size:1.15rem; font-weight:800;
      color:var(--clk-modal-text);
      margin-bottom:0.2rem;
    }
    .clk-modal-sub {
      font-size:0.85rem;
      color:var(--clk-modal-muted);
      margin-bottom:1.2rem;
    }

    .clk-coin-row {
      font-size:1.5rem; font-weight:800;
      color:var(--clk-modal-text);
      margin-bottom:0.2rem;
    }
    .clk-coin-row i { color:var(--clk-coin-color); }
    .clk-bar-wrap {
      background:var(--clk-modal-border);
      border-radius:99px;
      height:8px; margin:0.5rem auto 1rem;
      overflow:hidden; max-width:280px;
    }
    .clk-bar {
      background: linear-gradient(90deg,#f6ad55,#ed8936);
      height:100%; border-radius:99px;
      transition:width 0.4s ease;
    }

    .clk-ref-row {
      display:flex; gap:8px;
      margin-bottom:0.9rem; text-align:left;
    }
    .clk-ref-input {
      flex:1; padding:0.6rem 0.8rem;
      border:1.5px solid var(--clk-input-border);
      border-radius:10px;
      font-size:0.8rem;
      background:var(--clk-input-bg);
      color:var(--clk-input-text);
      outline:none;
    }
    .clk-copy-btn {
      padding:0.6rem 1rem;
      background:#2c5282; color:#fff;
      border:none; border-radius:10px;
      font-size:0.85rem; font-weight:700;
      cursor:pointer; transition:background 0.2s;
    }
    .clk-copy-btn:hover { background:#1a365d; }

    .clk-btn {
      width:100%; padding:0.85rem;
      border:none; border-radius:12px;
      font-size:0.95rem; font-weight:700;
      cursor:pointer; transition:opacity 0.2s, transform 0.15s;
      margin-bottom:0.6rem;
    }
    .clk-btn:hover  { transform:translateY(-1px); }
    .clk-btn:disabled { opacity:0.55; cursor:not-allowed; transform:none; }
    .clk-btn-share  { background:linear-gradient(135deg,#2C8252,#1a365d); color:#fff; }
    .clk-btn-unlock { background:linear-gradient(135deg,#f6ad55,#ed8936); color:#fff; }
    .clk-explain    { font-size:0.78rem; color:var(--clk-modal-muted); margin-top:0.2rem; }
    .clk-status     { margin-top:0.6rem; font-size:0.85rem; font-weight:600; color:#e53e3e; }
    .clk-status.ok  { color:#38a169; }

    .clk-spinner {
      display:inline-block; width:16px; height:16px;
      border:2.5px solid var(--clk-modal-border);
      border-top-color:#2c5282;
      border-radius:50%;
      animation:clkSpin 0.7s linear infinite;
      vertical-align:middle; margin-right:6px;
    }
    @keyframes clkSpin { to { transform:rotate(360deg) } }

    #clk-loading {
      padding:1.5rem 0;
      color:var(--clk-modal-muted);
      display:flex; align-items:center; justify-content:center; gap:10px;
    }
  `;
  document.head.appendChild(style);

  /* ══════════════════════════════════
     2.  INJECT MODAL HTML
  ══════════════════════════════════ */
  const modal = document.createElement('div');
  modal.id = 'clk-modal';
  modal.setAttribute('role', 'dialog');
  modal.innerHTML = `
    <div class="clk-modal-box">
      <button class="clk-modal-close" id="clk-close" aria-label="Close">&times;</button>

      <!-- Loading -->
      <div id="clk-loading">
        <span class="clk-spinner"></span> Checking access…
      </div>

      <!-- STATE A: Not enough coins — show referral link -->
      <div id="clk-state-a" style="display:none">
        <div style="font-size:2.2rem;margin-bottom:0.3rem">🔒</div>
        <div class="clk-modal-title" id="clk-title-a"></div>
        <div class="clk-modal-sub" id="clk-sub-a"></div>

        <div class="clk-coin-row">
          <i class="fas fa-coins"></i>
          <span id="clk-coins-a">0</span>
          <span style="font-size:1rem;color:var(--clk-modal-muted)"> / <span id="clk-required-a">0</span></span>
        </div>
        <div class="clk-bar-wrap">
          <div class="clk-bar" id="clk-bar" style="width:0%"></div>
        </div>

        <div class="clk-ref-row">
          <input class="clk-ref-input" id="clk-ref-input" readonly placeholder="Your referral link">
          <button class="clk-copy-btn" id="clk-copy-btn">
            <i class="fas fa-copy"></i>
          </button>
        </div>
        <button class="clk-btn clk-btn-share" id="clk-share-btn">
          <i class="fas fa-share-alt"></i> Share &amp; Earn Coins
        </button>
        <p class="clk-explain" id="clk-explain-a"></p>
      </div>

      <!-- STATE B: Enough coins — show unlock button -->
      <div id="clk-state-b" style="display:none">
        <div style="font-size:2.2rem;margin-bottom:0.3rem">🪙</div>
        <div class="clk-modal-title" id="clk-title-b"></div>
        <div class="clk-modal-sub" id="clk-sub-b"></div>
        <button class="clk-btn clk-btn-unlock" id="clk-unlock-btn">
          <i class="fas fa-lock-open"></i>
          Unlock Now · <span id="clk-cost-b">0</span> coins
        </button>
        <div class="clk-status" id="clk-status"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  /* ══════════════════════════════════
     3.  STATE
  ══════════════════════════════════ */
  let _sb       = null;
  let _user     = null;
  let _coins    = 0;
  let _refCode  = '';
  let _unlocked = {};   // { [platformId]: true }

  let _active = { id: '', coins: 0, label: '', href: '', el: null };

  /* ══════════════════════════════════
     4.  APPLY LOCK / UNLOCK VISUAL TO A CARD
  ══════════════════════════════════ */
  function applyLocked(card) {
    const coins = parseInt(card.getAttribute('data-lock-coins') || '0', 10);

    card.classList.add('clk-locked');
    card.classList.remove('clk-unlocked-user');

    // Remove old badges
    card.querySelectorAll('.clk-lock-badge, .clk-coin-tag').forEach(e => e.remove());

    // Lock icon badge (top-right corner) — aria-hidden so it's excluded from text search
    const badge = document.createElement('div');
    badge.className = 'clk-lock-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = '<i class="fas fa-lock"></i>';
    card.appendChild(badge);

    // Coin tag (inline at bottom) — aria-hidden so it's excluded from text search
    const tag = document.createElement('div');
    tag.className = 'clk-coin-tag';
    tag.setAttribute('aria-hidden', 'true');
    tag.innerHTML = '<i class="fas fa-coins" style="color:var(--clk-coin-color);margin-right:3px"></i>' + coins + ' coins to unlock';
    card.appendChild(tag);

    card.onclick = () => openModal(card);
  }

  function applyUnlocked(card) {
    card.classList.remove('clk-locked');
    card.classList.add('clk-unlocked-user');

    card.querySelectorAll('.clk-lock-badge, .clk-coin-tag').forEach(e => e.remove());

    const badge = document.createElement('div');
    badge.className = 'clk-lock-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = '<i class="fas fa-lock-open"></i>';
    card.appendChild(badge);

    const tag = document.createElement('div');
    tag.className = 'clk-coin-tag';
    tag.setAttribute('aria-hidden', 'true');
    tag.textContent = '✓ Unlocked';
    card.appendChild(tag);

    const href = card.getAttribute('data-lock-href');
    card.onclick = () => { if (href) window.location.href = href; };
  }

  function scanCards() {
    document.querySelectorAll('[data-lock-id]').forEach(card => {
      const id = card.getAttribute('data-lock-id');
      if (_unlocked[id]) {
        applyUnlocked(card);
      } else {
        applyLocked(card);
      }
    });
  }

  /* ══════════════════════════════════
     5.  MODAL OPEN / CLOSE / RENDER
  ══════════════════════════════════ */
  function openModal(card) {
    _active.id    = card.getAttribute('data-lock-id');
    _active.coins = parseInt(card.getAttribute('data-lock-coins') || '0', 10);
    _active.label = card.getAttribute('data-lock-label') || 'This Content';
    _active.href  = card.getAttribute('data-lock-href')  || '#';
    _active.el    = card;

    // Show loading state
    document.getElementById('clk-loading').style.display = 'flex';
    document.getElementById('clk-state-a').style.display = 'none';
    document.getElementById('clk-state-b').style.display = 'none';
    document.getElementById('clk-status').textContent    = '';
    modal.classList.add('open');

    // If Supabase+user already loaded, render immediately
    if (_user) { renderModal(); }
    // Otherwise init() will call renderModal() once done
  }

  function closeModal() {
    modal.classList.remove('open');
  }

  document.getElementById('clk-close').onclick = closeModal;
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  function renderModal() {
    document.getElementById('clk-loading').style.display = 'none';

    // Always clear status when re-rendering so stale messages don't persist
    const statusEl = document.getElementById('clk-status');
    if (statusEl) { statusEl.textContent = ''; statusEl.className = 'clk-status'; }

    const need = _active.coins;
    const refLink = window.location.origin + '/index.html?ref=' + encodeURIComponent(_refCode);

    if (_coins >= need) {
      /* ── State B: enough coins ── */
      document.getElementById('clk-state-a').style.display = 'none';
      document.getElementById('clk-state-b').style.display = 'block';
      document.getElementById('clk-title-b').textContent =
        'Unlock ' + _active.label;
      document.getElementById('clk-sub-b').textContent =
        'You have ' + _coins + ' coins. This costs ' + need + ' coins.';
      document.getElementById('clk-cost-b').textContent = need;

      const btn = document.getElementById('clk-unlock-btn');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-lock-open"></i> Unlock Now · ' + need + ' coins';
    } else {
      /* ── State A: not enough coins ── */
      document.getElementById('clk-state-a').style.display = 'block';
      document.getElementById('clk-state-b').style.display = 'none';

      document.getElementById('clk-title-a').textContent  = 'Unlock ' + _active.label;
      document.getElementById('clk-required-a').textContent = need;
      document.getElementById('clk-coins-a').textContent    = _coins;

      const pct = Math.min(100, need > 0 ? Math.round((_coins / need) * 100) : 0);
      document.getElementById('clk-bar').style.width = pct + '%';

      const refFriends = Math.ceil((need - _coins) / 5);
      document.getElementById('clk-sub-a').textContent =
        'Share your link — each signup earns 5 coins';
      document.getElementById('clk-ref-input').value = _refCode ? refLink : '';
      document.getElementById('clk-explain-a').innerHTML =
        'You need <strong>' + (need - _coins) + ' more coins</strong> (' +
        refFriends + ' friend' + (refFriends === 1 ? '' : 's') +
        ' via your link). Each signup = 5 coins.';
    }
  }

  /* ══════════════════════════════════
     6.  COPY + SHARE
  ══════════════════════════════════ */
  document.getElementById('clk-copy-btn').onclick = function () {
    const val = document.getElementById('clk-ref-input').value;
    if (!val) return;
    navigator.clipboard.writeText(val).then(() => {
      this.innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => { this.innerHTML = '<i class="fas fa-copy"></i>'; }, 1800);
    });
  };

  document.getElementById('clk-share-btn').onclick = function () {
    const link = document.getElementById('clk-ref-input').value;
    if (!link) return;
    if (navigator.share) {
      navigator.share({
        title: 'Afrahtafreeh — Medical Education',
        text : `⚕️ Afrahtafreeh: The White Army 🏥\nAll Lectures, Notes and Q banks Available Free 🆓\n\n📱 Compatibilit: Android (Chrome) | iPhone/iPad (Safari) only \n\n📖 Instructions: https://graph.org/How-To-Install-Nextpulse-App-08-04\n\n🔗 Website Link:`,
        url  : link
      }).catch(() => navigator.clipboard.writeText(link));
    } else {
      navigator.clipboard.writeText(link);
    }
  };

  /* ══════════════════════════════════
     7.  UNLOCK HANDLER
     Uses Supabase RPC (server-side function) so it runs with
     SECURITY DEFINER — bypasses all RLS policy issues entirely.
     The function does: check coins → deduct → insert unlock,
     all atomically in one DB transaction.
  ══════════════════════════════════ */
  document.getElementById('clk-unlock-btn').onclick = async function () {
    const btn    = this;
    const status = document.getElementById('clk-status');
    btn.disabled  = true;
    btn.innerHTML = '<span class="clk-spinner"></span> Unlocking…';
    status.textContent = '';
    status.className   = 'clk-status';

    try {
      const cost = _active.coins;

      // Call the server-side RPC function (SECURITY DEFINER — no RLS issues)
      const { data: result, error: rpcErr } = await _sb.rpc('unlock_platform', {
        p_platform_id : _active.id,
        p_cost        : cost
      });

      if (rpcErr) throw rpcErr;

      // result is the JSON returned by the function
      const res = typeof result === 'string' ? JSON.parse(result) : result;

      if (!res.success) {
        if (res.error === 'insufficient_coins') {
          // Update local coin count to match DB reality
          _coins = parseInt(res.coins ?? _coins, 10);
          updateCoinBadge(_coins);
          renderModal();   // will switch to State A
          return;
        }
        if (res.error === 'profile_not_found') {
          throw new Error('Your profile was not found. Please sign out and sign in again.');
        }
        throw new Error(res.error || 'Unlock failed. Please try again.');
      }

      // ── SUCCESS ──
      if (res.already_unlocked) {
        status.textContent = '✓ Already unlocked!';
        status.className   = 'clk-status ok';
      } else {
        status.textContent = '✓ Unlocked! Enjoy ' + _active.label + ' 🎉';
        status.className   = 'clk-status ok';
        _coins = parseInt(res.coins ?? (_coins - cost), 10);
        updateCoinBadge(_coins);
      }

      _unlocked[_active.id] = true;
      scanCards();
      setTimeout(() => {
        closeModal();
        if (_active.href && _active.href !== '#') window.location.href = _active.href;
      }, 1400);

    } catch (err) {
      console.error('card-lock unlock error:', err);
      status.textContent = 'Error: ' + (err.message || 'Please try again.');
      btn.disabled  = false;
      btn.innerHTML = '<i class="fas fa-lock-open"></i> Unlock Now · ' + _active.coins + ' coins';
    }
  };

  /* ══════════════════════════════════
     8.  COIN BADGE UPDATER
  ══════════════════════════════════ */
  function updateCoinBadge(n) {
    const el = document.getElementById('coin-count');
    if (el) el.textContent = n;
  }

  /* ══════════════════════════════════
     9.  SEQUENTIAL SUPABASE LOADER
         (sequential to avoid const re-declaration errors)
  ══════════════════════════════════ */
  function loadScript(src) {
    return new Promise((res, rej) => {
      // Don't load if already on the page
      if (document.querySelector('script[src="' + src + '"]')) { res(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function sbUrlDefined() {
    try { return typeof SUPABASE_URL !== 'undefined' && !!SUPABASE_URL; } catch(e) { return false; }
  }
  function sbKeyDefined() {
    try { return typeof SUPABASE_KEY !== 'undefined' && !!SUPABASE_KEY; } catch(e) { return false; }
  }
  function sbLibDefined() {
    try { return typeof supabase !== 'undefined' && !!supabase; } catch(e) { return false; }
  }

  async function ensureSupabase() {
    // Load Supabase CDN library if not already on the page
    if (!sbLibDefined()) {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      } catch (e) { return false; }
    }

    // Load supabase-config.js if SUPABASE_URL/KEY not yet defined
    // Try paths one at a time — sequential to avoid const re-declaration errors
    if (!sbUrlDefined()) {
      const paths = [
        '/supabase-config.js',
        '../../supabase-config.js',
        '../supabase-config.js',
        '../../../supabase-config.js'
      ];
      for (const p of paths) {
        if (sbUrlDefined()) break;
        try { await loadScript(p); } catch (e) { /* try next */ }
      }
    }

    return sbUrlDefined() && sbKeyDefined();
  }

  /* ══════════════════════════════════
     10. MAIN INIT
  ══════════════════════════════════ */
  async function init() {
    const lockedCards = document.querySelectorAll('[data-lock-id]');
    if (!lockedCards.length) return;

    // Apply locked state immediately (before auth check)
    lockedCards.forEach(applyLocked);

    try {
      const ok = await ensureSupabase();
      if (!ok) {
        // Supabase unavailable — fail open (show content)
        console.warn('card-lock: Supabase unavailable');
        return;
      }

      // Reuse existing Supabase client if page already created one (_supabase is
      // defined in some pages like app.html; otherwise create a fresh client)
      _sb = (typeof _supabase !== 'undefined' && _supabase)
        ? _supabase
        : supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

      const { data: authData } = await _sb.auth.getSession();
      const session = authData?.session;
      if (!session) {
        // Not signed in — update modal if open
        if (modal.classList.contains('open')) {
          document.getElementById('clk-loading').innerHTML =
            '<span style="color:#e53e3e;font-size:0.9rem">Please sign in first to unlock content.</span>';
        }
        return;
      }

      _user = session.user;

      // Load profile (coins + referral code)
      const { data: profile } = await _sb
        .from('profiles')
        .select('coins, referral_code')
        .eq('id', _user.id)
        .single();

      _coins   = parseInt(profile?.coins ?? 0, 10);
      _refCode = profile?.referral_code || '';
      updateCoinBadge(_coins);

      // Fetch all unlocked platforms for this user at once
      const { data: rows } = await _sb
        .from('unlocked_platforms')
        .select('platform_id')
        .eq('user_id', _user.id);

      (rows || []).forEach(r => { _unlocked[r.platform_id] = true; });

      // Update card visuals now that we have real data
      scanCards();

      // If modal is already open (user clicked before init finished), render it now
      if (modal.classList.contains('open')) renderModal();

      // Realtime: update coin count when profile changes
      _sb.channel('clk-' + _user.id)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'profiles',
          filter: 'id=eq.' + _user.id
        }, payload => {
          _coins   = parseInt(payload.new.coins ?? 0, 10);
          _refCode = payload.new.referral_code || _refCode;
          updateCoinBadge(_coins);
          if (modal.classList.contains('open')) renderModal();
        })
        .subscribe();

    } catch (err) {
      console.error('card-lock init error:', err);
      // If modal is open but we errored, show a message
      if (modal.classList.contains('open')) {
        document.getElementById('clk-loading').innerHTML =
          '<span style="color:#e53e3e">Could not connect. Please refresh.</span>';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
