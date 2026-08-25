/* ================= Flashcards logic ================= */
const WORKER_URL = 'https://flashcard-upload.mynextpulse123.workers.dev';

let sb = null;
let ME = null;               // { userId, name, college, pic }
let CARDS = [];              // current feed (raw rows)
let LIKED = new Set();       // card ids current user liked
let TAB = 'all';             // all | mine | due
let SEARCH = '';
let studyList = [];          // cards currently in study mode

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => (s == null ? '' : String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])));
function fallbackAvatar(name){ return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name || 'User') + '&background=2c5282&color=fff&size=128&bold=true'; }
function timeAgo(ts){
  const d = (Date.now() - new Date(ts).getTime())/1000;
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d/60)+'m ago';
  if (d < 86400) return Math.floor(d/3600)+'h ago';
  if (d < 604800) return Math.floor(d/86400)+'d ago';
  return new Date(ts).toLocaleDateString();
}

/* ---------- theme ---------- */
function refreshThemeIcon(){
  const dark = (window._theme ? window._theme.get() : 'dark') !== 'light';
  $('themeToggle').innerHTML = dark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  document.querySelector('meta[name=theme-color]').setAttribute('content', dark ? '#0f1420' : '#f2f5fb');
}
$('themeToggle').addEventListener('click', () => { if (window._theme) window._theme.toggle(); refreshThemeIcon(); });

/* ---------- boot ---------- */
(async function boot(){
  refreshThemeIcon();
  // wait for supabase client
  let tries = 0;
  while (!window._supabase && tries++ < 40){
    if (window.supabase && window.SUPABASE_URL){
      try { window._supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY); } catch(e){}
    }
    if (window._supabase) break;
    await new Promise(r => setTimeout(r, 100));
  }
  sb = window._supabase;
  if (!sb){ $('feed').innerHTML = '<div class="fc-empty">Could not init. Refresh the page.</div>'; return; }

  const { data:{ session } } = await sb.auth.getSession();
  if (!session){ location.replace('../auth.html'); return; }

  // profile
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
  // when searching -> most liked first, else newest first
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
      const hay = ((c.front_text||'')+' '+(c.back_text||'')+' '+tags.join(' ')).toLowerCase();
      const textOk = !textTerms || hay.includes(textTerms);
      return tagOk && textOk;
    });
  }
  if (TAB === 'due'){
    out = out.filter(c => isDue(c.id));
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
       : TAB==='due' ? 'Nothing due right now. Great job! 🎉'
       : 'No flashcards yet. Be the first — tap +!')+'</div>';
    return;
  }
  feed.innerHTML = list.map(cardHTML).join('');
}

function cardHTML(c){
  const liked = LIKED.has(c.id);
  const media = c.front_image
    ? `<img class="fc-card-media" src="${esc(c.front_image)}" onclick="zoomImg('${esc(c.front_image)}')" onerror="this.style.display='none'"/>` : '';
  const front = c.front_text ? `<div class="fc-front">${esc(c.front_text)}</div>`
    : (!c.front_image ? `<div class="fc-front" style="color:var(--muted)">(image / options card)</div>` : '');
  const tags = (c.tags||[]).length
    ? `<div class="fc-tags">${c.tags.map(t=>`<span class="fc-tag" onclick="searchTag('${esc(t)}')">#${esc(t)}</span>`).join('')}</div>` : '';
  const badge = c.card_type === 'mcq'
    ? '<span class="fc-badge mcq"><i class="fas fa-list-check"></i> MCQ</span>'
    : '<span class="fc-badge basic"><i class="fas fa-clone"></i> BASIC</span>';
  const info = c.is_anonymous
    ? `<button class="fc-info"><i class="fas fa-user-secret"></i> Anonymous</button>`
    : `<button class="fc-info" onclick="showCreator('${c.id}')"><i class="fas fa-circle-info"></i> Info</button>`;
  return `<div class="fc-card">
    ${media}
    <div class="fc-card-body">
      ${badge}${front}${tags}
    </div>
    <div class="fc-card-foot">
      <button class="fc-like ${liked?'liked':''}" onclick="toggleLike('${c.id}',this)">
        <i class="fa${liked?'s':'r'} fa-heart"></i> <span>${c.likes_count||0}</span>
      </button>
      ${info}
      <button class="fc-open" onclick="studyFrom('${c.id}')"><i class="fas fa-expand"></i> Solve</button>
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
    .subscribe();
}

/* ---------- likes ---------- */
async function toggleLike(id, btn){
  if (!ME) return;
  const liked = LIKED.has(id);
  // optimistic
  const span = btn.querySelector('span');
  const icon = btn.querySelector('i');
  let count = parseInt(span.textContent || '0', 10);
  if (liked){ LIKED.delete(id); count--; btn.classList.remove('liked'); icon.className='far fa-heart'; }
  else { LIKED.add(id); count++; btn.classList.add('liked'); icon.className='fas fa-heart'; }
  span.textContent = Math.max(0,count);
  const { data, error } = await sb.rpc('toggle_like', { p_card: id });
  if (error){ // revert
    if (liked){ LIKED.add(id); } else { LIKED.delete(id); }
    await loadFeed(); return;
  }
  if (typeof data === 'number'){ span.textContent = data; }
  const c = CARDS.find(x=>x.id===id); if (c) c.likes_count = parseInt(span.textContent,10);
}

/* ---------- creator info ---------- */
function showCreator(id){
  const c = CARDS.find(x => x.id === id);
  if (!c) return;
  const name = c.creator_name || 'User';
  const pic = c.creator_pic || fallbackAvatar(name);
  $('creatorBody').innerHTML =
    `<img src="${esc(pic)}" onerror="this.src='${fallbackAvatar(name)}'"/>
     <div class="name">${esc(name)}</div>
     <div class="college"><i class="fas fa-graduation-cap"></i> ${esc(c.creator_college || 'College not set')}</div>`;
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

/* ---------- create ---------- */
let cardType = 'basic';
$('fab').addEventListener('click', () => { resetForm(); openOverlay('createOverlay'); });
$('typeSeg').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
  $('typeSeg').querySelectorAll('button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); cardType = b.dataset.type;
  $('mcqBlock').style.display = cardType === 'mcq' ? 'flex' : 'none';
  if (cardType === 'mcq' && !$('optList').children.length){ addOption(); addOption(); }
}));

function addOption(){
  const idx = $('optList').children.length;
  const row = document.createElement('div');
  row.className = 'fc-opt-row';
  row.innerHTML = `<input type="radio" name="correctOpt" value="${idx}" ${idx===0?'checked':''} title="Correct answer"/>
    <input type="text" class="fc-input" placeholder="Option ${idx+1}"/>
    <button type="button" class="fc-opt-rm"><i class="fas fa-trash"></i></button>`;
  row.querySelector('.fc-opt-rm').addEventListener('click', () => { row.remove(); });
  $('optList').appendChild(row);
}
$('addOpt').addEventListener('click', addOption);

function bindImg(inputId, prevId, rmId){
  const input = $(inputId), prev = $(prevId), rm = $(rmId);
  input.addEventListener('change', () => {
    const f = input.files[0];
    if (!f) return;
    prev.src = URL.createObjectURL(f); prev.classList.add('show'); rm.classList.add('show');
  });
  rm.addEventListener('click', () => { input.value=''; prev.src=''; prev.classList.remove('show'); rm.classList.remove('show'); });
}
bindImg('frontImg','frontPrev','frontRm');
bindImg('backImg','backPrev','backRm');

function resetForm(){
  cardType='basic';
  $('typeSeg').querySelectorAll('button').forEach((x,i)=>x.classList.toggle('active', i===0));
  $('mcqBlock').style.display='none'; $('optList').innerHTML='';
  $('frontText').value=''; $('backText').value=''; $('tags').value=''; $('anon').checked=false;
  ['frontImg','backImg'].forEach(id=>$(id).value='');
  ['frontPrev','backPrev'].forEach(id=>$(id).classList.remove('show'));
  ['frontRm','backRm'].forEach(id=>$(id).classList.remove('show'));
  showMsg('', '');
}
function showMsg(type, text){ const m=$('createMsg'); m.className='fc-msg '+(type||''); m.textContent=text; }

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
    .filter(Boolean)
    .filter((v,i,a)=>a.indexOf(v)===i)
    .slice(0,10);
}

$('saveBtn').addEventListener('click', async () => {
  const btn = $('saveBtn');
  const frontText = $('frontText').value.trim();
  const backText = $('backText').value.trim();
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

  // validation: front needs something, back needs something (mcq back optional if correct exists)
  const hasFront = frontText || frontFile || (cardType==='mcq' && options.length);
  const hasBack = backText || backFile || cardType==='mcq';
  if (!hasFront){ showMsg('err','Add front text, image, or options.'); return; }
  if (!hasBack){ showMsg('err','Add back text or image (the answer).'); return; }

  btn.disabled = true; showMsg('', ''); btn.innerHTML = '<i class="fas fa-spinner spin"></i> Uploading…';
  try{
    let frontUrl=null, backUrl=null;
    if (frontFile) frontUrl = await uploadImage(frontFile);
    if (backFile) backUrl = await uploadImage(backFile);

    const anon = $('anon').checked;
    const row = {
      user_id: ME.userId,
      front_text: frontText || null,
      front_image: frontUrl,
      back_text: backText || null,
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
    btn.innerHTML = '<i class="fas fa-spinner spin"></i> Publishing…';
    const { data, error } = await sb.from('flashcards').insert(row).select().single();
    if (error) throw error;
    // prepend locally (in case realtime is off)
    if (!CARDS.find(c=>c.id===data.id)) CARDS.unshift(data);
    showMsg('ok','Published! 🎉');
    setTimeout(() => { closeOverlay('createOverlay'); resetForm(); if (TAB!=='due') renderFeed(); }, 700);
  }catch(e){
    showMsg('err', e.message || 'Something went wrong.');
  }finally{
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish Flashcard';
  }
});

/* =================== SRS (SM-2 simplified) =================== */
function srsKey(){ return 'fc_srs_' + (ME ? ME.userId : 'anon'); }
function getSRS(){ try { return JSON.parse(localStorage.getItem(srsKey()) || '{}'); } catch(e){ return {}; } }
function setSRS(o){ localStorage.setItem(srsKey(), JSON.stringify(o)); }
function isDue(id){
  const s = getSRS()[id];
  if (!s) return true;               // never studied => due
  return new Date(s.due).getTime() <= Date.now();
}
const GRADES = {
  again:{ label:'Again', mins:1 },
  hard:{ label:'Hard' },
  good:{ label:'Good' },
  easy:{ label:'Easy' }
};
function nextInterval(prev, grade){
  // returns {interval(days), ease}
  let ease = prev ? prev.ease : 2.5;
  let interval = prev ? prev.interval : 0;
  let reps = prev ? prev.reps : 0;
  if (grade === 'again'){ reps = 0; interval = 0; ease = Math.max(1.3, ease - 0.2); return { ease, interval:0, reps, mins:1 }; }
  if (grade === 'hard'){ ease = Math.max(1.3, ease - 0.15); interval = interval ? interval * 1.2 : 1; }
  else if (grade === 'good'){ interval = interval ? interval * ease : 1; }
  else if (grade === 'easy'){ ease = ease + 0.15; interval = interval ? interval * ease * 1.3 : 3; }
  reps++;
  interval = Math.max(1, Math.round(interval));
  return { ease, interval, reps };
}
function gradeLabel(id, grade){
  const cur = getSRS()[id];
  const r = nextInterval(cur, grade);
  if (grade==='again') return '1 min';
  if (r.interval === 1) return '1 day';
  return r.interval + ' days';
}
function applyGrade(id, grade){
  const all = getSRS();
  const r = nextInterval(all[id], grade);
  let due;
  if (grade === 'again') due = new Date(Date.now() + 60*1000);
  else due = new Date(Date.now() + r.interval*24*3600*1000);
  all[id] = { ease:r.ease, interval:r.interval, reps:r.reps, due: due.toISOString() };
  setSRS(all);
}

/* =================== Study (reels) =================== */
$('studyAll').addEventListener('click', () => startStudy(applyFilters(CARDS)));
function studyFrom(id){
  const list = applyFilters(CARDS);
  const idx = list.findIndex(c => c.id === id);
  const ordered = idx > 0 ? list.slice(idx).concat(list.slice(0, idx)) : list;
  startStudy(ordered.length ? ordered : CARDS.filter(c=>c.id===id));
}
function startStudy(list){
  if (!list || !list.length) return;
  studyList = list;
  $('reels').innerHTML = list.map((c,i)=>slideHTML(c,i)).join('');
  $('studyCount').textContent = '1 / ' + list.length;
  $('study').classList.add('show');
  document.body.style.overflow = 'hidden';
  $('reels').scrollTop = 0;
  bindReelObserver();
}
function slideHTML(c, i){
  const backImg = c.back_image ? `<img class="fc-face-img" src="${esc(c.back_image)}" onerror="this.style.display='none'"/>` : '';
  const frontImg = c.front_image ? `<img class="fc-face-img" src="${esc(c.front_image)}" onerror="this.style.display='none'"/>` : '';
  const frontTxt = c.front_text ? `<div class="fc-face-text">${esc(c.front_text)}</div>` : '';
  const backTxt = c.back_text ? `<div class="fc-face-text">${esc(c.back_text)}</div>` : '';
  let mcq = '';
  if (c.card_type === 'mcq' && (c.options||[]).length){
    mcq = `<div class="fc-mcq" data-correct="${c.correct_index}">` +
      c.options.map((o,oi)=>`<button onclick="pickMCQ(this,${oi},${c.correct_index})">${esc(o)}</button>`).join('') +
      `</div>`;
  }
  return `<div class="fc-slide" data-idx="${i}">
    <div class="fc-flip">
      <div class="fc-face" data-face="front">
        <div class="fc-face-label"><i class="fas fa-eye"></i> Question</div>
        ${frontImg}${frontTxt}${mcq}
        <button class="fc-showbtn" onclick="showBack(${i})"><i class="fas fa-rotate"></i> Show Answer</button>
      </div>
      <div class="fc-face" data-face="back" style="display:none">
        <div class="fc-face-label"><i class="fas fa-lightbulb"></i> Answer</div>
        ${backImg}${backTxt || (c.card_type==='mcq' ? `<div class="fc-face-text">Correct: ${esc((c.options||[])[c.correct_index]||'')}</div>` : '')}
        <div class="fc-grades">
          <button class="g-again" onclick="doGrade('${c.id}','again',${i})">Again<small>${gradeLabel(c.id,'again')}</small></button>
          <button class="g-hard" onclick="doGrade('${c.id}','hard',${i})">Hard<small>${gradeLabel(c.id,'hard')}</small></button>
          <button class="g-good" onclick="doGrade('${c.id}','good',${i})">Good<small>${gradeLabel(c.id,'good')}</small></button>
          <button class="g-easy" onclick="doGrade('${c.id}','easy',${i})">Easy<small>${gradeLabel(c.id,'easy')}</small></button>
        </div>
      </div>
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
function showBack(i){
  const slide = $('reels').querySelector(`.fc-slide[data-idx="${i}"]`);
  if (!slide) return;
  slide.querySelector('[data-face="front"]').style.display = 'none';
  slide.querySelector('[data-face="back"]').style.display = 'flex';
}
function doGrade(id, grade, i){
  applyGrade(id, grade);
  // move to next slide
  const reels = $('reels');
  const next = reels.querySelector(`.fc-slide[data-idx="${i+1}"]`);
  if (next) next.scrollIntoView({ behavior:'smooth' });
  else { // finished
    setTimeout(closeStudy, 400);
    if (TAB === 'due') loadFeed();
  }
}
function bindReelObserver(){
  const reels = $('reels');
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if (e.isIntersecting){ const idx=+e.target.dataset.idx; $('studyCount').textContent=(idx+1)+' / '+studyList.length; } });
  }, { root:reels, threshold:0.6 });
  reels.querySelectorAll('.fc-slide').forEach(s=>obs.observe(s));
}
function closeStudy(){ $('study').classList.remove('show'); document.body.style.overflow=''; if (TAB==='due') renderFeed(); }
$('studyClose').addEventListener('click', closeStudy);

/* expose for inline handlers */
window.toggleLike = toggleLike;
window.showCreator = showCreator;
window.searchTag = searchTag;
window.zoomImg = zoomImg;
window.studyFrom = studyFrom;
window.showBack = showBack;
window.doGrade = doGrade;
window.pickMCQ = pickMCQ;
