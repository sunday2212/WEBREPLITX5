/* ================= Flashcards logic ================= */
const WORKER_URL = 'https://flashcard-upload.mynextpulse123.workers.dev';

let sb = null;
let ME = null;               // { userId, name, college, pic }
let CARDS = [];              // current feed (raw rows)
let LIKED = new Set();       // card ids current user liked
let TAB = 'all';             // all | mine
let SEARCH = '';
let studyList = [];
let editingId = null;

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => (s == null ? '' : String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])));
function fallbackAvatar(name){ return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name || 'User') + '&background=2c5282&color=fff&size=128&bold=true'; }

/* ---- safe rich-text ---- */
function filterStyle(s){
  const allow = ['color','background-color','font-weight','font-style','text-decoration','font-size','font-family'];
  return (s||'').split(';').map(x=>x.trim()).filter(Boolean).filter(r=>{
    const p = r.split(':')[0].trim().toLowerCase();
    return allow.includes(p) && !/url\(|expression|javascript:/i.test(r);
  }).join('; ');
}
function sanitizeHTML(html){
  const allowed = {B:1,STRONG:1,I:1,EM:1,U:1,SPAN:1,BR:1,DIV:1,P:1,FONT:1,UL:1,OL:1,LI:1};
  const box = document.createElement('div');
  box.innerHTML = html || '';
  (function clean(node){
    Array.from(node.childNodes).forEach(ch => {
      if (ch.nodeType === 3) return;                 // text
      if (ch.nodeType !== 1){ ch.remove(); return; } // comments etc
      if (!allowed[ch.tagName]){
        while (ch.firstChild) node.insertBefore(ch.firstChild, ch);
        node.removeChild(ch); return;
      }
      Array.from(ch.attributes).forEach(a => {
        const n = a.name.toLowerCase();
        const keepFont = (ch.tagName === 'FONT' && (n === 'color' || n === 'size'));
        if (n === 'style') ch.setAttribute('style', filterStyle(a.value));
        else if (!keepFont) ch.removeAttribute(a.name);
      });
      clean(ch);
    });
  })(box);
  return box.innerHTML;
}
function stripHTML(html){ const d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').trim(); }

/* ---------- theme ---------- */
function refreshThemeIcon(){
  const dark = (window._theme ? window._theme.get() : 'dark') !== 'light';
  $('themeToggle').innerHTML = dark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  document.querySelector('meta[name=theme-color]').setAttribute('content', dark ? '#0f1420' : '#f2f5fb');
}
$('themeToggle').addEventListener('click', () => { if (window._theme) window._theme.toggle(); refreshThemeIcon(); });

/* ---------- rich text editor ---------- */
let savedRange = null;
document.addEventListener('selectionchange', () => {
  const sel = document.getSelection();
  if (!sel.rangeCount) return;
  const r = sel.getRangeAt(0);
  let n = r.commonAncestorContainer;
  while (n && n !== document){ if (n.classList && n.classList.contains('fc-rte-area')){ savedRange = r; return; } n = n.parentNode; }
});
function initRTE(root){
  const area = root.querySelector('.fc-rte-area');
  function run(cmd, val){
    area.focus();
    if (savedRange){ const sel = document.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
    document.execCommand(cmd, false, val);
  }
  root.querySelectorAll('[data-cmd]').forEach(el => {
    const cmd = el.dataset.cmd;
    if (el.tagName === 'BUTTON'){
      el.addEventListener('mousedown', e => { e.preventDefault(); run(cmd, null); });
    } else if (el.tagName === 'INPUT'){
      el.addEventListener('input', () => run(cmd, el.value));
    } else if (el.tagName === 'SELECT'){
      el.addEventListener('change', () => run(cmd, el.value));
    }
  });
}
document.querySelectorAll('.fc-rte').forEach(initRTE);

/* ---------- boot ---------- */
(async function boot(){
  refreshThemeIcon();
  let tries = 0;
  while (!window._supabase && tries++ < 40){
    if (window.supabase && window.SUPABASE_URL && !window._supabase){
      window._supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    }
    if (window._supabase) break;
    await new Promise(r => setTimeout(r, 100));
  }
  sb = window._supabase;
  if (!sb){ $('feed').innerHTML = '<div class="fc-empty">Could not init. Refresh the page.</div>'; return; }

  const { data:{ session } } = await sb.auth.getSession();
  if (!session){ location.replace('../auth.html'); return; }

  const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  ME = {
    userId: session.user.id,
    name: (profile && profile.name) || session.user.email,
    college: (profile && profile.college) || '',
    pic: (profile && profile.profile_pic_url) || fallbackAvatar(profile && profile.name)
  };
  const av = $('userAvatar');
  av.src = ME.pic; av.style.display = 'block';
  av.onerror = () => { av.src = fallbackAvatar(ME.name); };

  await loadLikes();
  await loadFeed();
  subscribeRealtime();
})();

/* ---------- data ---------- */
async function loadLikes(){
  if (!ME) return;
  const { data } = await sb.from('flashcard_likes').select('card_id').eq('user_id', ME.userId);
  LIKED = new Set((data || []).map(r => r.card_id));
}
async function loadFeed(){
  $('feed').innerHTML = '<div class="fc-loading"><i class="fas fa-spinner spin"></i> Loading…</div>';
  let q = sb.from('flashcards').select('*');
  if (TAB === 'mine') q = q.eq('user_id', ME.userId);
  if (SEARCH) q = q.order('likes_count', { ascending:false }).order('created_at', { ascending:false });
  else q = q.order('created_at', { ascending:false });
  q = q.limit(300);
  const { data, error } = await q;
  if (error){ $('feed').innerHTML = '<div class="fc-empty"><i class="fas fa-triangle-exclamation"></i>'+esc(error.message)+'</div>'; return; }
  CARDS = data || [];
  renderFeed();
}
function applyFilters(list){
  let out = list.slice();
  if (SEARCH){
    const raw = SEARCH.trim().toLowerCase();
    const tagTerms = (raw.match(/#[\w-]+/g) || []).map(t => t.slice(1));
    const textTerms = raw.replace(/#[\w-]+/g,'').trim();
    out = out.filter(c => {
      const tags = (c.tags || []).map(t => String(t).toLowerCase());
      const tagOk = tagTerms.length === 0 || tagTerms.every(t => tags.some(ct => ct.includes(t)));
      const hay = (stripHTML(c.front_text)+' '+stripHTML(c.back_text)+' '+tags.join(' ')).toLowerCase();
      const textOk = !textTerms || hay.includes(textTerms);
      return tagOk && textOk;
    });
  }
  return out;
}
function renderFeed(){
  const list = applyFilters(CARDS);
  const feed = $('feed');
  if (!list.length){
    feed.innerHTML = '<div class="fc-empty"><i class="fas fa-layer-group"></i>'+
      (TAB==='mine' ? 'You have no flashcards yet. Tap + to create one!'
       : SEARCH ? 'No flashcards match your search.'
       : 'No flashcards yet. Be the first — tap +!')+'</div>';
    return;
  }
  feed.innerHTML = list.map(cardHTML).join('');
}
function cardHTML(c){
  const liked = LIKED.has(c.id);
  const media = c.front_image
    ? `<img class="fc-card-media" src="${esc(c.front_image)}" onclick="openSolve('${c.id}')" onerror="this.style.display='none'"/>` : '';
  const front = c.front_text ? `<div class="fc-front">${sanitizeHTML(c.front_text)}</div>`
    : (!c.front_image ? `<div class="fc-front" style="color:var(--muted)">Tap to solve</div>` : '');
  const tags = (c.tags||[]).length
    ? `<div class="fc-tags">${c.tags.map(t=>`<span class="fc-tag" onclick="event.stopPropagation();searchTag('${esc(t)}')">#${esc(t)}</span>`).join('')}</div>` : '';
  const badge = c.card_type === 'mcq'
    ? '<span class="fc-badge mcq"><i class="fas fa-list-check"></i> MCQ</span>'
    : '<span class="fc-badge basic"><i class="fas fa-clone"></i> BASIC</span>';
  const infoIcon = c.is_anonymous
    ? '<i class="fas fa-user-secret"></i>'
    : '<i class="fas fa-circle-info"></i>';
  const owner = ME && c.user_id === ME.userId;
  const ownerBtns = owner
    ? `<button class="fc-fbtn" title="Edit" onclick="event.stopPropagation();openEdit('${c.id}')"><i class="fas fa-pen"></i></button>
       <button class="fc-fbtn del" title="Delete" onclick="event.stopPropagation();delCard('${c.id}')"><i class="fas fa-trash"></i></button>` : '';
  return `<div class="fc-card">
    ${media}
    <div class="fc-card-body" onclick="openSolve('${c.id}')">
      ${badge}${front}${tags}
    </div>
    <div class="fc-card-foot">
      <button class="fc-like ${liked?'liked':''}" title="Like" onclick="event.stopPropagation();toggleLike('${c.id}',this)">
        <i class="fa${liked?'s':'r'} fa-heart"></i> <span>${c.likes_count||0}</span>
      </button>
      <button class="fc-fbtn" title="Who created this" onclick="event.stopPropagation();showCreator('${c.id}')">${infoIcon}</button>
      <div class="fc-foot-right">${ownerBtns}</div>
    </div>
  </div>`;
}

/* ---------- realtime ---------- */
function subscribeRealtime(){
  sb.channel('flashcards-feed')
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'flashcards' }, (payload) => {
      const row = payload.new;
      if (CARDS.find(c => c.id === row.id)) return;
      CARDS.unshift(row);
      if (!SEARCH) renderFeed();
    })
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'flashcards' }, (payload) => {
      const i = CARDS.findIndex(c => c.id === payload.new.id);
      if (i >= 0){ CARDS[i] = payload.new; renderFeed(); }
    })
    .on('postgres_changes', { event:'DELETE', schema:'public', table:'flashcards' }, (payload) => {
      CARDS = CARDS.filter(c => c.id !== payload.old.id);
      renderFeed();
    })
    .subscribe();
}

/* ---------- likes ---------- */
async function toggleLike(id, btn){
  if (!ME) return;
  const liked = LIKED.has(id);
  const span = btn.querySelector('span');
  const icon = btn.querySelector('i');
  let count = parseInt(span.textContent || '0', 10);
  if (liked){ LIKED.delete(id); count--; btn.classList.remove('liked'); icon.className='far fa-heart'; }
  else { LIKED.add(id); count++; btn.classList.add('liked'); icon.className='fas fa-heart'; }
  span.textContent = Math.max(0,count);
  const { data, error } = await sb.rpc('toggle_like', { p_card: id });
  if (error){ if (liked){ LIKED.add(id); } else { LIKED.delete(id); } await loadFeed(); return; }
  if (typeof data === 'number') span.textContent = data;
  const c = CARDS.find(x=>x.id===id); if (c) c.likes_count = parseInt(span.textContent,10);
}

/* ---------- creator info ---------- */
function showCreator(id){
  const c = CARDS.find(x => x.id === id);
  if (!c) return;
  if (c.is_anonymous){
    $('creatorBody').innerHTML = `<div class="anon-ic"><i class="fas fa-user-secret"></i></div>
      <div class="name">Anonymous</div><div class="college">This creator chose to stay hidden</div>`;
  } else {
    const name = c.creator_name || 'User';
    const pic = c.creator_pic || fallbackAvatar(name);
    $('creatorBody').innerHTML = `<img src="${esc(pic)}" onerror="this.src='${fallbackAvatar(name)}'"/>
      <div class="name">${esc(name)}</div>
      <div class="college"><i class="fas fa-graduation-cap"></i> ${esc(c.creator_college || 'College not set')}</div>`;
  }
  openOverlay('creatorOverlay');
}

/* ---------- search / tabs ---------- */
let searchTimer;
$('search').addEventListener('input', (e) => {
  SEARCH = e.target.value;
  $('clearSearch').style.display = SEARCH ? 'block' : 'none';
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadFeed, 250);
});
$('clearSearch').addEventListener('click', () => { $('search').value=''; SEARCH=''; $('clearSearch').style.display='none'; loadFeed(); });
function searchTag(tag){ $('search').value = '#'+tag; SEARCH = '#'+tag; $('clearSearch').style.display='block'; loadFeed(); window.scrollTo({top:0,behavior:'smooth'}); }
document.querySelectorAll('.fc-tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.fc-tab').forEach(x=>x.classList.remove('active'));
  t.classList.add('active'); TAB = t.dataset.tab; loadFeed();
}));

/* ---------- overlays ---------- */
function openOverlay(id){ $(id).classList.add('show'); }
function closeOverlay(id){ $(id).classList.remove('show'); }
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeOverlay(b.dataset.close)));
document.querySelectorAll('.fc-overlay').forEach(o => o.addEventListener('click', (e) => { if (e.target === o) o.classList.remove('show'); }));
function zoomImg(src){ $('zoomImg').src = src; openOverlay('zoomOverlay'); }

/* ---------- shared card face (solve popup + study) ---------- */
function faceHTML(c){
  const qImg = c.front_image ? `<img class="fc-face-img" src="${esc(c.front_image)}" onclick="zoomImg('${esc(c.front_image)}')" onerror="this.style.display='none'"/>` : '';
  const qTxt = c.front_text ? `<div class="fc-face-text">${sanitizeHTML(c.front_text)}</div>` : '';
  let mcq = '';
  if (c.card_type === 'mcq' && (c.options||[]).length){
    mcq = `<div class="fc-mcq" data-correct="${c.correct_index}">` +
      c.options.map((o,oi)=>`<button onclick="pickMCQ(this,${oi},${c.correct_index})">${esc(o)}</button>`).join('') +
      `</div>`;
  }
  const aImg = c.back_image ? `<img class="fc-face-img" src="${esc(c.back_image)}" onclick="zoomImg('${esc(c.back_image)}')" onerror="this.style.display='none'"/>` : '';
  const aTxt = c.back_text ? `<div class="fc-face-text">${sanitizeHTML(c.back_text)}</div>`
    : (c.card_type==='mcq' ? `<div class="fc-face-text">✅ ${esc((c.options||[])[c.correct_index]||'')}</div>` : '');
  return `<div class="fc-q">
      <div class="fc-face-label"><i class="fas fa-eye"></i> Question</div>
      ${qImg}${qTxt}${mcq}
    </div>
    <button class="fc-showbtn" onclick="revealAnswer(this)"><i class="fas fa-rotate"></i> Show Answer</button>
    <div class="fc-a" style="display:none">
      <div class="fc-face-label"><i class="fas fa-lightbulb"></i> Answer</div>
      ${aImg}${aTxt}
    </div>`;
}
function revealAnswer(btn){
  const face = btn.parentNode;
  const ans = face.querySelector('.fc-a');
  ans.style.display = 'flex';
  btn.style.display = 'none';
  ans.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

/* ---------- solve popup (single card) ---------- */
function openSolve(id){
  const c = CARDS.find(x => x.id === id);
  if (!c) return;
  $('solveBody').innerHTML = faceHTML(c);
  $('solveBody').scrollTop = 0;
  openOverlay('solveOverlay');
}

/* ---------- create / edit ---------- */
let cardType = 'basic';
$('fab').addEventListener('click', () => { resetForm(); $('createTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Create Flashcard'; $('saveBtn').innerHTML = '<i class="fas fa-paper-plane"></i> Publish Flashcard'; openOverlay('createOverlay'); });
$('typeSeg').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
  $('typeSeg').querySelectorAll('button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); cardType = b.dataset.type;
  $('mcqBlock').style.display = cardType === 'mcq' ? 'flex' : 'none';
  if (cardType === 'mcq' && !$('optList').children.length){ addOption(); addOption(); }
}));
function addOption(text, correct){
  const idx = $('optList').children.length;
  const row = document.createElement('div');
  row.className = 'fc-opt-row';
  row.innerHTML = `<input type="radio" name="correctOpt" value="${idx}" ${correct||idx===0?'checked':''} title="Correct answer"/>
    <input type="text" class="fc-input" placeholder="Option ${idx+1}" value="${esc(text||'')}"/>
    <button type="button" class="fc-opt-rm"><i class="fas fa-trash"></i></button>`;
  row.querySelector('.fc-opt-rm').addEventListener('click', () => { row.remove(); });
  $('optList').appendChild(row);
}
$('addOpt').addEventListener('click', () => addOption());

function bindImg(inputId, prevId, rmId){
  const input = $(inputId), prev = $(prevId), rm = $(rmId);
  input.addEventListener('change', () => {
    const f = input.files[0];
    if (!f) return;
    prev.dataset.url = '';                    // replacing any existing url
    prev.src = URL.createObjectURL(f); prev.classList.add('show'); rm.classList.add('show');
  });
  rm.addEventListener('click', () => { input.value=''; prev.src=''; prev.dataset.url=''; prev.classList.remove('show'); rm.classList.remove('show'); });
}
bindImg('frontImg','frontPrev','frontRm');
bindImg('backImg','backPrev','backRm');

function resetForm(){
  editingId = null;
  cardType='basic';
  $('typeSeg').querySelectorAll('button').forEach((x,i)=>x.classList.toggle('active', i===0));
  $('mcqBlock').style.display='none'; $('optList').innerHTML='';
  $('frontText').innerHTML=''; $('backText').innerHTML=''; $('tags').value=''; $('anon').checked=false;
  ['frontImg','backImg'].forEach(id=>$(id).value='');
  ['frontPrev','backPrev'].forEach(id=>{ const p=$(id); p.src=''; p.dataset.url=''; p.classList.remove('show'); });
  ['frontRm','backRm'].forEach(id=>$(id).classList.remove('show'));
  showMsg('', '');
}
function showMsg(type, text){ const m=$('createMsg'); m.className='fc-msg '+(type||''); m.textContent=text; }

function openEdit(id){
  const c = CARDS.find(x => x.id === id);
  if (!c) return;
  resetForm();
  editingId = id;
  $('createTitle').innerHTML = '<i class="fas fa-pen"></i> Edit Flashcard';
  $('saveBtn').innerHTML = '<i class="fas fa-check"></i> Update Flashcard';
  cardType = c.card_type || 'basic';
  $('typeSeg').querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.type === cardType));
  $('frontText').innerHTML = sanitizeHTML(c.front_text || '');
  $('backText').innerHTML = sanitizeHTML(c.back_text || '');
  $('tags').value = (c.tags||[]).map(t=>'#'+t).join(' ');
  $('anon').checked = !!c.is_anonymous;
  if (cardType === 'mcq'){
    $('mcqBlock').style.display = 'flex';
    (c.options||[]).forEach((o,i)=>addOption(o, i === c.correct_index));
    if (!(c.options||[]).length){ addOption(); addOption(); }
  }
  if (c.front_image){ const p=$('frontPrev'); p.src=c.front_image; p.dataset.url=c.front_image; p.classList.add('show'); $('frontRm').classList.add('show'); }
  if (c.back_image){ const p=$('backPrev'); p.src=c.back_image; p.dataset.url=c.back_image; p.classList.add('show'); $('backRm').classList.add('show'); }
  openOverlay('createOverlay');
}

async function delCard(id){
  if (!confirm('Delete this flashcard permanently?')) return;
  const { error } = await sb.from('flashcards').delete().eq('id', id);
  if (error){ alert('Delete failed: ' + error.message); return; }
  CARDS = CARDS.filter(c => c.id !== id);
  renderFeed();
}

async function uploadImage(file){
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(WORKER_URL, { method:'POST', body: fd });
  if (!res.ok) throw new Error('Image upload failed ('+res.status+')');
  const json = await res.json();
  if (!json.url) throw new Error('Upload returned no URL');
  return json.url;
}
function parseTags(raw){
  return (raw.match(/#?[\w-]+/g) || [])
    .map(t => t.replace(/^#/,'').trim().toLowerCase())
    .filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,10);
}

$('saveBtn').addEventListener('click', async () => {
  const btn = $('saveBtn');
  const frontText = sanitizeHTML($('frontText').innerHTML.trim());
  const backText = sanitizeHTML($('backText').innerHTML.trim());
  const frontFile = $('frontImg').files[0];
  const backFile = $('backImg').files[0];

  let options = [], correctIndex = null;
  if (cardType === 'mcq'){
    const rows = [...$('optList').children];
    options = rows.map(r => r.querySelector('input[type=text]').value.trim()).filter(Boolean);
    const checked = $('optList').querySelector('input[type=radio]:checked');
    correctIndex = checked ? parseInt(checked.value,10) : 0;
    if (options.length < 2){ showMsg('err','Add at least 2 options for a multiple-choice card.'); return; }
    if (correctIndex >= options.length) correctIndex = 0;
  }

  const hasFront = stripHTML(frontText) || frontFile || $('frontPrev').dataset.url || (cardType==='mcq' && options.length);
  const hasBack = stripHTML(backText) || backFile || $('backPrev').dataset.url || cardType==='mcq';
  if (!hasFront){ showMsg('err','Add front text, image, or options.'); return; }
  if (!hasBack){ showMsg('err','Add back text or image (the answer).'); return; }

  btn.disabled = true; showMsg('', ''); const origHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner spin"></i> Uploading…';
  try{
    let frontUrl = $('frontPrev').dataset.url || null;
    let backUrl = $('backPrev').dataset.url || null;
    if (frontFile) frontUrl = await uploadImage(frontFile);
    if (backFile) backUrl = await uploadImage(backFile);

    const anon = $('anon').checked;
    const row = {
      user_id: ME.userId,
      front_text: stripHTML(frontText) ? frontText : null,
      front_image: frontUrl,
      back_text: stripHTML(backText) ? backText : null,
      back_image: backUrl,
      card_type: cardType,
      options: cardType==='mcq' ? options : [],
      correct_index: cardType==='mcq' ? correctIndex : null,
      tags: parseTags($('tags').value),
      is_anonymous: anon,
      creator_name: anon ? null : ME.name,
      creator_college: anon ? null : ME.college,
      creator_pic: anon ? null : ME.pic
    };

    if (editingId){
      btn.innerHTML = '<i class="fas fa-spinner spin"></i> Updating…';
      const { data, error } = await sb.from('flashcards').update(row).eq('id', editingId).select().single();
      if (error) throw error;
      const i = CARDS.findIndex(c=>c.id===editingId); if (i>=0) CARDS[i] = data;
      showMsg('ok','Updated! 🎉');
    } else {
      btn.innerHTML = '<i class="fas fa-spinner spin"></i> Publishing…';
      const { data, error } = await sb.from('flashcards').insert(row).select().single();
      if (error) throw error;
      if (!CARDS.find(c=>c.id===data.id)) CARDS.unshift(data);
      showMsg('ok','Published! 🎉');
    }
    setTimeout(() => { closeOverlay('createOverlay'); resetForm(); renderFeed(); }, 700);
  }catch(e){
    showMsg('err', e.message || 'Something went wrong.');
  }finally{
    btn.disabled = false; btn.innerHTML = editingId ? '<i class="fas fa-check"></i> Update Flashcard' : '<i class="fas fa-paper-plane"></i> Publish Flashcard';
  }
});

/* =================== Study (reels) =================== */
$('studyAll').addEventListener('click', () => startStudy(applyFilters(CARDS)));
function startStudy(list){
  if (!list || !list.length){ alert('No flashcards to study yet.'); return; }
  studyList = list;
  $('reels').innerHTML = list.map((c,i)=>slideHTML(c,i)).join('');
  $('studyCount').textContent = '1 / ' + list.length;
  $('study').classList.add('show');
  document.body.style.overflow = 'hidden';
  $('reels').scrollTop = 0;
  bindReelObserver();
}
function slideHTML(c, i){
  return `<div class="fc-slide" data-idx="${i}">
    <div class="fc-flip">
      <div class="fc-face">${faceHTML(c)}</div>
    </div>
    ${i < studyList.length-1 ? '<div class="fc-swipe-hint"><i class="fas fa-chevron-down"></i> scroll for next</div>' : '<div class="fc-swipe-hint">🎉 last card</div>'}
  </div>`;
}
function pickMCQ(btn, picked, correct){
  const wrap = btn.closest('.fc-mcq');
  if (wrap.dataset.answered) return;
  wrap.dataset.answered = '1';
  [...wrap.children].forEach((b,i)=>{ if(i===correct) b.classList.add('correct'); });
  if (picked !== correct) btn.classList.add('wrong');
}
function bindReelObserver(){
  const reels = $('reels');
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if (e.isIntersecting){ const idx=+e.target.dataset.idx; $('studyCount').textContent=(idx+1)+' / '+studyList.length; } });
  }, { root:reels, threshold:0.6 });
  reels.querySelectorAll('.fc-slide').forEach(s=>obs.observe(s));
}
function closeStudy(){ $('study').classList.remove('show'); document.body.style.overflow=''; }
$('studyClose').addEventListener('click', closeStudy);

/* expose for inline handlers */
window.toggleLike = toggleLike;
window.showCreator = showCreator;
window.searchTag = searchTag;
window.zoomImg = zoomImg;
window.openSolve = openSolve;
window.revealAnswer = revealAnswer;
window.openEdit = openEdit;
window.delCard = delCard;
window.pickMCQ = pickMCQ;
