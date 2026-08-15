// ============================================================================
// Game controller: turn rotation, 60s round timer, scoring, question sourcing
// and all UI rendering. Backend-agnostic (works with DemoNet or SupabaseNet).
// ============================================================================

import { CONFIG } from './config.js';
import { aiManual, aiBank, randomFromBank, SAMPLE_BANK } from './ai.js';
import { SUBJECTS, DIFFICULTY_LEVELS } from '../Aiquiz/js/config.js';
import * as qbank from './qbank.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Renders trusted question-bank / AI HTML (with images) using a DOM allowlist:
// only safe formatting tags survive; <style>, <script>, iframe, svg, event
// handlers, inline styles and non-http image srcs are stripped. Manual player
// input is untrusted in multiplayer, so this must be an allowlist, not a blacklist.
const ALLOWED_TAGS = new Set(['P','BR','SPAN','B','STRONG','I','EM','U','SUB','SUP',
  'IMG','TABLE','THEAD','TBODY','TR','TD','TH','UL','OL','LI','DIV','SMALL',
  'BLOCKQUOTE','CODE','PRE','HR','FONT']);
const DROP_TAGS = new Set(['SCRIPT','STYLE','IFRAME','SVG','LINK','META','OBJECT',
  'EMBED','FORM','INPUT','BUTTON','TEXTAREA','SELECT','AUDIO','VIDEO','BASE',
  'TITLE','HEAD','NOSCRIPT','TEMPLATE']);
const IMG_ATTRS = ['src','alt','width','height'];
const rich = (s) => {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(s == null ? '' : s);
  const clean = (parent) => {
    Array.from(parent.childNodes).forEach((n) => {
      if (n.nodeType === Node.COMMENT_NODE) { n.remove(); return; }
      if (n.nodeType !== Node.ELEMENT_NODE) return; // text nodes pass through
      const tag = n.tagName;
      if (DROP_TAGS.has(tag)) { n.remove(); return; }
      if (!ALLOWED_TAGS.has(tag)) {          // unwrap unknown tag, keep clean children
        clean(n);
        while (n.firstChild) parent.insertBefore(n.firstChild, n);
        n.remove();
        return;
      }
      const keep = tag === 'IMG' ? IMG_ATTRS : [];
      Array.from(n.attributes).forEach((a) => {
        const name = a.name.toLowerCase();
        if (!keep.includes(name)) { n.removeAttribute(a.name); return; }
        if (name === 'src') {
          const src = String(a.value).trim();
          // Question-bank images may be same-origin relative paths. Resolve
          // those against the game page while rejecting javascript/data URLs.
          try {
            const url = new URL(src, document.baseURI);
            const isSafeDataImage = url.protocol === 'data:'
              && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src);
            if ((!/^https?:$/.test(url.protocol) && !isSafeDataImage)
                || (url.origin !== window.location.origin
                  && !/^https?:\/\//i.test(src) && !isSafeDataImage)) {
              n.removeAttribute(a.name);
            } else {
              n.setAttribute('src', url.href);
            }
          } catch (e) {
            n.removeAttribute(a.name);
          }
        }
      });
      clean(n);
    });
  };
  clean(tpl.content);
  return tpl.innerHTML;
};
const expBlock = (q) => q && q.explanation
  ? `<div class="explanation"><b>Explanation</b><div>${rich(q.explanation)}</div>${q.explanationImage
    ? rich(`<img src="${esc(q.explanationImage)}" alt="Explanation illustration">`) : ''}</div>`
  : (q && q.explanationImage
    ? `<div class="explanation"><b>Explanation</b>${rich(`<img src="${esc(q.explanationImage)}" alt="Explanation illustration">`)}</div>` : '');
// Plain-text preview (strips tags) + first image src — used for pickable lists.
const plain = (s) => { const d = document.createElement('div'); d.innerHTML = rich(s); return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
const firstImg = (s) => { const d = document.createElement('div'); d.innerHTML = rich(s); const im = d.querySelector('img'); return im ? im.getAttribute('src') : ''; };
const imageBlock = (q, className = 'question-image') => {
  if (!q || !q.image || firstImg(q.text)) return '';
  const safe = rich(`<img src="${esc(q.image)}" alt="Question illustration">`);
  return safe ? `<div class="${className}">${safe}</div>` : '';
};

const LS = {
  get provider() { return localStorage.getItem('qg_provider') || CONFIG.DEFAULT_AI_PROVIDER; },
  set provider(v) { localStorage.setItem('qg_provider', v); },
  get key() {
    const settings = window.AIKeyManager && window.AIKeyManager.getCachedAISettings();
    return (settings && settings.keys[LS.provider]) || localStorage.getItem('qg_apikey') || '';
  },
  set key(v) { localStorage.setItem('qg_apikey', v); },
};

export class Game {
  constructor(net) {
    this.net = net;
    this.me = null;
    this.players = [];
    this.state = null;
    this.answers = [];
    this.myScore = 0;
    this.scoredRounds = new Set();
    this._tick = null;
    this._seenAnswers = new Set();
    this._activityTimers = new Map();
  }

  async start() {
    const res = await this.net.init({
      onPlayers: (p) => { this.players = p; this.renderLeaderboard(); this.maybeHostBootstrap(); },
      onRoomState: (s) => this.onRoomState(s),
      onAnswers: (a) => { this.answers = a; this.onAnswersUpdate(); },
    });
    if (res && res.redirecting) return; // OAuth redirect in progress
    this.me = this.net.me;
    // Seed the shared provider/key settings from the user's Supabase profile.
    if (typeof this.net.loadApiKey === 'function') {
      try {
        const s = await this.net.loadApiKey();
        if (s) {
          if (s.provider) LS.provider = s.provider;
          if (s.keys && s.keys[LS.provider]) LS.key = s.keys[LS.provider];
        }
      } catch (e) { /* ignore */ }
    }
    this.renderHeader();
    this.maybeHostBootstrap();
    // The room state is realtime, but the countdown is local UI state. Redraw
    // it every second for every player instead of waiting for a database event.
    this._tick = setInterval(() => {
      this.hostLoop();
      if (this.state?.phase === 'answering') this.renderStage();
    }, 1000);
  }

  // ---------- host orchestration ----------
  present() { return this.players.slice(); }

  maybeHostBootstrap() {
    if (!this.me || !this.net.isHost()) return;
    const s = this.net.getRoomState();
    const setterPresent = s?.setterId && this.present().some(p => p.id === s.setterId);
    // If the current setter leaves while the source picker is open, promote
    // the next online player so the room never gets stuck in setup.
    if (!s || s.phase === 'lobby' || !s.phase || (s.phase === 'setting' && !setterPresent)) {
      if (this.present().length >= 1) this.beginSetting(null);
    }
  }

  nextSetterId(currentId) {
    const list = this.present();
    if (!list.length) return null;
    if (!currentId) return list[0].id;
    const idx = list.findIndex(p => p.id === currentId);
    return list[(idx + 1) % list.length].id;
  }

  async beginSetting(prevSetter) {
    const setter = this.nextSetterId(prevSetter);
    const round = ((this.net.getRoomState()?.round) || 0) + 1;
    await this.net.setRoomState({ phase: 'setting', round, setterId: setter,
      question: null, startTs: null, endTs: null });
  }

  async hostLoop() {
    if (!this.me || !this.net.isHost()) return;
    const s = this.net.getRoomState();
    if (!s) return;

    // DEMO: if a bot is the setter, host auto-picks a question for them
    if (s.phase === 'setting' && CONFIG && this.net.constructor.name === 'DemoNet'
        && s.setterId !== this.me.id && !s.question) {
      const q = randomFromBank();
      await this.startAnswering(q);
      return;
    }

    if (s.phase === 'answering') {
      const now = Date.now();
      const answerers = this.present().filter(p => p.id !== s.setterId);
      const answered = new Set(this.answers.filter(a => a.round === s.round).map(a => a.userId));
      const allAnswered = answerers.length > 0 && answerers.every(p => answered.has(p.id));
      if (now >= s.endTs || allAnswered) {
        await this.net.setRoomState({ ...s, phase: 'results' });
      }
    } else if (s.phase === 'results') {
      if (!this._resultsAt) this._resultsAt = Date.now();
      if (Date.now() - this._resultsAt >= CONFIG.RESULTS_SECONDS * 1000) {
        this._resultsAt = null;
        await this.beginSetting(s.setterId);
      }
    }
  }

  async startAnswering(question) {
    const s = this.net.getRoomState();
    const startTs = Date.now();
    const endTs = startTs + CONFIG.ROUND_SECONDS * 1000;
    await this.net.setRoomState({ phase: 'answering', round: s.round,
      setterId: s.setterId, question, startTs, endTs });
  }

  // ---------- reactions ----------
  onRoomState(s) {
    const prev = this.state;
    this.state = s;
    if (!s) return;
    if (!prev || prev.round !== s.round) { this.myAnswered = false; }
    if (s.phase === 'results') { this.scoreMyRound(s); }
    if (s.phase !== 'results') { this._resultsAt = null; }
    this.renderStage();
  }

  onAnswersUpdate() {
    this.answers.forEach((answer) => {
      const key = `${answer.round}:${answer.userId}`;
      if (this._seenAnswers.has(key)) return;
      this._seenAnswers.add(key);
      if (answer.userId !== this.me?.id && answer.round === this.state?.round) {
        this.showLiveActivity(answer);
      }
    });
    if (this.state && this.state.phase === 'answering') this.renderStage();
  }

  scoreMyRound(s) {
    if (this.scoredRounds.has(s.round)) { this.showResultsPopup(s); this.renderStage(); return; }
    this.scoredRounds.add(s.round);
    const mine = this.answers.find(a => a.round === s.round && a.userId === this.me.id);
    let pts = 0;
    if (this.me.id === s.setterId) {
      pts = CONFIG.SETTER_BONUS;
    } else if (mine && mine.choiceIndex === s.question.correctIndex) {
      const remaining = Math.max(0, (s.endTs - mine.answeredAt) / 1000);
      pts = Math.max(CONFIG.MIN_CORRECT_POINTS,
        Math.round(CONFIG.BASE_POINTS * (remaining / CONFIG.ROUND_SECONDS)));
    }
    if (pts) { this.myScore += pts; this.net.setScore(this.me.id, this.myScore); }
    if (mine) mine.points = pts;
    this.showResultsPopup(s);
  }

  async submitMyAnswer(choiceIndex) {
    if (this.myAnswered || !this.state || this.state.phase !== 'answering') return;
    if (this.me.id === this.state.setterId) return;
    this.myAnswered = true;
    await this.net.submitAnswer({ round: this.state.round, userId: this.me.id,
      name: this.me.name, avatar: this.me.avatar, choiceIndex, answeredAt: Date.now() });
    this.renderStage();
  }

  // ---------- question sourcing (setter's turn) ----------
  openSourcePicker() {
    this.modal(`<h2>Your turn — choose a question</h2>
      <p class="muted">Pick how you want to set this question.</p>
      <div class="source-grid">
         <button class="src" data-src="manual"><span>✍️</span>Manual + AI Assist<small>Write, fix or auto-fill an MCQ</small></button>
        <button class="src" data-src="bookmarks"><span>⭐</span>From Bookmarks</button>
        <button class="src" data-src="bank"><span>📚</span>AI Question Bank</button>
        <button class="src" data-src="folder"><span>📁</span>Question Bank Folder</button>
      </div>`, true, () => this.closeModal());
    this.modalEl.querySelectorAll('.src').forEach(b =>
      b.addEventListener('click', () => this.handleSource(b.dataset.src)));
  }

  handleSource(src) {
    if (src === 'manual') return this.formManual();
    if (src === 'bookmarks') return this.listBookmarks();
    if (src === 'bank') return this.formBank();
    if (src === 'folder') return this.formFolder();
  }

  formManual() {
    this.modal(`<h2>Manual Entry</h2>
      <p class="muted">Write an MCQ yourself, or leave any field blank and let AI complete and proofread it.</p>
      <label>Question or image</label>
      <textarea id="m-q" class="auto-expand" rows="2" placeholder="Type your question, or add an image below for an image-based question"></textarea>
      <div class="image-picker">
        <span class="muted">Optional question image</span>
        <input id="m-q-image" type="file" accept="image/png,image/jpeg,image/gif,image/webp" />
      </div>
      <div id="m-q-image-preview"></div>
      ${[0,1,2,3].map(i => `<label class="opt-lbl">Option ${i+1} <input type="radio" name="m-c" value="${i}"/> correct</label>
        <input id="m-o${i}" placeholder="Option ${i+1}" />`).join('')}
      <label>Explanation or image (optional)</label>
      <textarea id="m-exp" class="auto-expand" rows="2" placeholder="Explain the answer, or add an explanation image below"></textarea>
      <div class="image-picker">
        <span class="muted">Optional explanation image</span>
        <input id="m-exp-image" type="file" accept="image/png,image/jpeg,image/gif,image/webp" />
      </div>
      <div id="m-exp-image-preview"></div>
      <div class="btn-row">
        <button class="ghost" id="m-ai" type="button">✨ AI Fix / Fill</button>
        <button class="primary" id="m-go" type="button">Start Question</button>
      </div>
       <p class="muted">AI uses NEET PG medical knowledge to fix spelling, grammar and medical errors, fill blank fields, or generate a complete question when everything is blank.</p>`,
       true, () => this.openSourcePicker());
    const readForm = () => ({
      question: $('#m-q', this.modalEl).value.trim(),
      options: [0,1,2,3].map(i => $('#m-o'+i, this.modalEl).value.trim()),
      correctIndex: this.modalEl.querySelector('input[name="m-c"]:checked')
        ? Number(this.modalEl.querySelector('input[name="m-c"]:checked').value) : null,
      explanation: $('#m-exp', this.modalEl).value.trim(),
      image: $('#m-q-image', this.modalEl).dataset.dataUrl || '',
      explanationImage: $('#m-exp-image', this.modalEl).dataset.dataUrl || '',
    });
    const writeForm = (q) => {
      $('#m-q', this.modalEl).value = q.text || '';
      (q.options || []).forEach((o, i) => { const el = $('#m-o'+i, this.modalEl); if (el) el.value = o; });
      const r = this.modalEl.querySelector(`input[name="m-c"][value="${Number.isInteger(Number(q.correctIndex)) ? Number(q.correctIndex) : 0}"]`);
      if (r) r.checked = true;
      if (q.explanation) $('#m-exp', this.modalEl).value = q.explanation;
    };
    const autoExpand = (el) => {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * .45)}px`;
    };
    this.modalEl.querySelectorAll('textarea.auto-expand').forEach((el) => {
      el.addEventListener('input', () => autoExpand(el));
      autoExpand(el);
    });
    const setupImagePicker = (inputId, previewId) => {
      const input = $(`#${inputId}`, this.modalEl);
      const preview = $(`#${previewId}`, this.modalEl);
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) {
          input.value = '';
          return this.toast('Please choose an image smaller than 4 MB');
        }
        const reader = new FileReader();
        reader.onload = () => {
          input.dataset.dataUrl = String(reader.result || '');
          preview.innerHTML = `<div class="image-preview">
            <img src="${esc(input.dataset.dataUrl)}" alt="Selected image">
            <span>${esc(file.name)}</span>
            <button class="remove-image" type="button">Remove</button>
          </div>`;
          preview.querySelector('.remove-image').addEventListener('click', () => {
            input.value = ''; delete input.dataset.dataUrl; preview.innerHTML = '';
          });
        };
        reader.readAsDataURL(file);
      });
    };
    setupImagePicker('m-q-image', 'm-q-image-preview');
    setupImagePicker('m-exp-image', 'm-exp-image-preview');
    $('#m-ai', this.modalEl).addEventListener('click', async () => {
      const btn = $('#m-ai', this.modalEl); btn.disabled = true; btn.textContent = 'Thinking…';
      try {
        const q = await aiManual(readForm(), LS.provider, LS.key);
        writeForm(q);
         this.toast('AI fixed and filled the question — review, then Start Question');
      } catch (e) { this.toast('AI failed: ' + e.message); }
      finally { btn.disabled = false; btn.textContent = '✨ AI Fix / Fill'; }
    });
    $('#m-go', this.modalEl).addEventListener('click', () => {
      const f = readForm();
      if ((!f.question && !f.image) || f.options.some(o => !o) || f.correctIndex == null)
        return this.toast('Add a question or image, fill all 4 options and choose the correct answer');
      this.commitQuestion({ text: f.question, options: f.options, correctIndex: f.correctIndex,
        explanation: f.explanation, image: f.image, explanationImage: f.explanationImage });
    });
  }

  async listBookmarks() {
    this.modal(`<h2>⭐ From Bookmarks</h2><p class="muted">Tap a question to set it for everyone.</p><div id="bm-list" class="list"><div class="spinner"></div></div>`,
      true, () => this.openSourcePicker());
    let rows = [];
    try { if (typeof this.net.getBookmarks === 'function') rows = await this.net.getBookmarks(); } catch (e) { /* ignore */ }
    // The user may have pressed the back arrow while the bookmark query was
    // in flight. Do not render into the newly opened source picker.
    if (!this.modalEl || !$('#bm-list', this.modalEl)) return;
    const el = $('#bm-list', this.modalEl);
    if (!rows.length) {
      const items = SAMPLE_BANK.slice(0, 5);
      el.innerHTML = items.map((q, i) => `<button class="row bm-row" data-i="${i}"><span class="bm-txt">${esc(plain(q.text))}</span></button>`).join('')
        || '<p class="muted">No bookmarks found.</p>';
      this.modalEl.querySelectorAll('.bm-row').forEach(b =>
        b.addEventListener('click', () => this.commitQuestion(items[b.dataset.i])));
      return;
    }
    // Resolve each bookmark to its real question so we can preview text + image.
    const resolved = await Promise.all(rows.map(async (r) => {
      try { const q = await qbank.resolveBookmark(r.file_path, Number(r.question_index) || 0); return (q && q.text) ? q : null; }
      catch { return null; }
    }));
    const items = [];
    const html = resolved.map((q, i) => {
      if (!q) return '';
      const r = rows[i];
      const label = r.topic_name || String(r.file_path).split('/').pop().replace(/\.json$/i, '').replace(/_/g, ' ');
      const idx = items.push(q) - 1;
      const snip = plain(q.text).slice(0, 160) || label;
       const img = firstImg(q.text) || q.image || '';
       return `<button class="row bm-row" data-i="${idx}">
        ${img ? `<img class="bm-thumb" src="${esc(img)}" alt=""/>` : ''}
         <span class="bm-txt"><span class="bm-tag">${esc(label)}</span><span class="bm-preview-text">${esc(snip)}</span></span></button>`;
    }).join('');
    el.innerHTML = html || '<p class="muted">No readable bookmarks found.</p>';
    this.modalEl.querySelectorAll('.bm-row').forEach(b =>
      b.addEventListener('click', () => this.commitQuestion(items[b.dataset.i])));
  }

  // AI Question Bank — Subject + Sub-topic + Hardness (from Aiquiz) + free-text topic -> Groq
  formBank() {
    const configured = !!LS.key;
    const subjects = Object.keys(SUBJECTS);
    const levels = Object.keys(DIFFICULTY_LEVELS);
     this.modal(`<h2>📚 AI Question Bank</h2>
      ${configured ? '' : '<p class="warn">No API key saved. Add one in Settings (⚙️) or a sample question will be used.</p>'}
      <label>Subject</label><select id="b-sub">${subjects.map(s => `<option>${esc(s)}</option>`).join('')}</select>
       <label>Chapter / Sub-topic</label><select id="b-chap"></select>
       <label>Hardness level</label><select id="b-diff">${levels.map(l => `<option value="${esc(l)}">${esc(l)} — ${esc(DIFFICULTY_LEVELS[l])}</option>`).join('')}</select>
       <label>Specific topic (type yourself, optional)</label><input id="b-top" placeholder="e.g. Frank-Starling law" />
      <p class="muted">AI generates a NEET PG question from your selection. Provider: <b>${esc(LS.provider)}</b></p>
       <button class="primary" id="b-go" type="button">Generate & Start</button>`,
       true, () => this.openSourcePicker());
    const subSel = $('#b-sub', this.modalEl), chapSel = $('#b-chap', this.modalEl);
    const fillChapters = () => {
      const chs = SUBJECTS[subSel.value] || [];
      chapSel.innerHTML = chs.map(c => `<option>${esc(c)}</option>`).join('');
    };
    subSel.addEventListener('change', fillChapters); fillChapters();
    $('#b-go', this.modalEl).addEventListener('click', async () => {
      const btn = $('#b-go', this.modalEl); btn.disabled = true; btn.textContent = 'Generating…';
      try {
        const q = await aiBank({
          subject: subSel.value,
          chapter: chapSel.value,
          difficulty: $('#b-diff', this.modalEl).value,
          topic: $('#b-top', this.modalEl).value.trim(),
        }, LS.provider, LS.key);
        this.commitQuestion(q);
      } catch (e) { this.toast('AI failed: ' + e.message); this.formBank(); }
    });
  }

  // Question Bank Folder — cascading Platform -> Folder -> File -> Question
  async formFolder() {
    this.modal(`<h2>📁 Question Bank Folder</h2>
      <label>Platform</label><select id="ff-plat"><option>Loading…</option></select>
      <label>Folder</label><select id="ff-folder"><option value="">—</option></select>
      <label>File</label><select id="ff-file"><option value="">—</option></select>
       <label>Question</label><div id="ff-q" class="list"><p class="muted">Pick a file above.</p></div>`,
       true, () => this.openSourcePicker());
    const platSel = $('#ff-plat', this.modalEl), folSel = $('#ff-folder', this.modalEl),
      fileSel = $('#ff-file', this.modalEl), qList = $('#ff-q', this.modalEl);

    let platforms = [];
    try { platforms = await qbank.getPlatforms(); } catch (e) { /* fall through */ }
    if (!this.modalEl || !$('#ff-plat', this.modalEl)) return;

    if (!platforms.length) { // demo / manifest unavailable -> sample bank
      const folders = [...new Set(SAMPLE_BANK.map(q => q.chapter))];
      platSel.innerHTML = '<option>Demo Bank</option>';
      folSel.innerHTML = folders.map(f => `<option>${esc(f)}</option>`).join('');
      fileSel.parentElement.style.display = 'none'; fileSel.style.display = 'none';
      const load = () => {
        const items = SAMPLE_BANK.filter(q => q.chapter === folSel.value);
        qList.innerHTML = items.map((q, i) => `<button class="row" data-i="${i}">${esc(q.text)}</button>`).join('') || '<p class="muted">Empty</p>';
        this.modalEl.querySelectorAll('#ff-q .row').forEach(b => b.addEventListener('click', () => this.commitQuestion(items[b.dataset.i])));
      };
      folSel.addEventListener('change', load); load();
      return;
    }

    platSel.innerHTML = '<option value="">Select platform</option>' + platforms.map(p => `<option>${esc(p)}</option>`).join('');
    platSel.addEventListener('change', async () => {
      folSel.innerHTML = '<option>Loading…</option>'; fileSel.innerHTML = '<option value="">—</option>'; qList.innerHTML = '';
      if (!platSel.value) { folSel.innerHTML = '<option value="">—</option>'; return; }
      const folders = await qbank.getFoldersForPlatform(platSel.value);
      folSel.innerHTML = '<option value="">Select folder</option>' + folders.map(f =>
        `<option value="${esc(f.path)}">${esc(f.path.split('/').slice(1).join(' / ') || f.path)} (${f.count})</option>`).join('');
    });
    folSel.addEventListener('change', async () => {
      fileSel.innerHTML = '<option>Loading…</option>'; qList.innerHTML = '';
      if (!folSel.value) { fileSel.innerHTML = '<option value="">—</option>'; return; }
      const files = await qbank.getFilesInFolder(folSel.value);
      fileSel.innerHTML = '<option value="">Select file</option>' + files.map(f => `<option value="${esc(f.path)}">${esc(f.name)}</option>`).join('');
    });
    fileSel.addEventListener('change', async () => {
      if (!fileSel.value) { qList.innerHTML = ''; return; }
      qList.innerHTML = '<div class="spinner"></div>';
      let qs = [];
      try { qs = await qbank.getQuestions(fileSel.value); } catch (e) { /* ignore */ }
      if (!qs.length) { qList.innerHTML = '<p class="muted">No questions in this file.</p>'; return; }
      qList.innerHTML = qs.slice(0, 150).map((q, i) => `<button class="row" data-i="${i}">${esc(plain(q.text).slice(0, 130))}</button>`).join('');
      this.modalEl.querySelectorAll('#ff-q .row').forEach(b => b.addEventListener('click', () => this.commitQuestion(qs[b.dataset.i])));
    });
  }

  async commitQuestion(q) {
    if (!q || !Array.isArray(q.options) || q.options.length < 2) return this.toast('Invalid question');
    const question = { text: q.text, options: q.options, correctIndex: q.correctIndex,
      explanation: q.explanation || q.solution || '', image: q.image || '',
       explanationImage: q.explanationImage || '' };
    this.closeModal();
    const storedQuestion = await this.prepareQuestionMedia(question);
    await this.startAnswering(storedQuestion);
  }

  // Data URLs are useful for the local preview, but large base64 strings are
  // unreliable in realtime JSON payloads. Upload manual images to Supabase
  // Storage when available and keep the data URL as a fallback for demo mode.
  async prepareQuestionMedia(question) {
    if (typeof this.net.uploadImage !== 'function') return question;
    const prepared = { ...question };
    for (const key of ['image', 'explanationImage']) {
      if (!String(prepared[key] || '').startsWith('data:image/')) continue;
      try {
        prepared[key] = await this.net.uploadImage(prepared[key], key);
      } catch (e) {
        this.toast('Image storage is not configured; keeping the local image for this question');
      }
    }
    return prepared;
  }

  // ---------- rendering ----------
  renderHeader() {
    $('#me-avatar').src = this.me.avatar || '';
    $('#me-name').textContent = this.me.name;
    $('#me-college').textContent = this.me.college || '';
    $('#room-badge').textContent = (this.net.constructor.name === 'DemoNet')
      ? 'DEMO MODE' : 'LIVE';
  }

  renderLeaderboard() {
    const ranked = this.present().slice().sort((a, b) => b.score - a.score);
    $('#lb-count').textContent = ranked.length;
    $('#leaderboard').innerHTML = ranked.map((p, i) => `
      <div class="lb-row ${p.id === this.me?.id ? 'me' : ''}">
        <div class="rank r${i+1}">${i+1}</div>
        <img class="av" src="${esc(p.avatar)}" alt=""/>
        <div class="who"><div class="nm">${esc(p.name)}${p.id === this.me?.id ? ' (you)' : ''}</div>
          <div class="col">${esc(p.college || '')}</div></div>
        <div class="pts">${p.score}</div>
      </div>`).join('') || '<p class="muted">No players online</p>';
  }

  showLiveActivity(answer) {
    const root = $('#live-activity');
    if (!root) return;
    const key = `${answer.round}:${answer.userId}`;
    const item = document.createElement('div');
    item.className = 'live-activity-item';
    item.innerHTML = `<img src="${esc(answer.avatar || '')}" alt="">
      <span class="activity-name">${esc(answer.name || 'A player')}</span>
      <span class="activity-copy">answered</span>`;
    root.appendChild(item);
    while (root.children.length > 4) root.firstElementChild.remove();
    clearTimeout(this._activityTimers.get(key));
    const timer = setTimeout(() => {
      item.classList.add('leaving');
      setTimeout(() => item.remove(), 500);
      this._activityTimers.delete(key);
    }, 3600);
    this._activityTimers.set(key, timer);
  }

  renderStage() {
    const s = this.state;
    const stage = $('#stage');
    if (!s || s.phase === 'lobby' || !s.phase) {
      stage.innerHTML = `<div class="center"><h2>Waiting for the game to start…</h2></div>`;
      return;
    }
    const setter = this.present().find(p => p.id === s.setterId);
    const setterName = setter ? setter.name : 'someone';
    const iAmSetter = s.setterId === this.me.id;

    if (s.phase === 'setting') {
      if (iAmSetter) {
        stage.innerHTML = `<div class="center">
           <h2>It’s your turn!</h2><p class="muted">Set a question for everyone.</p>
          <button class="primary big" id="pick">Choose a question</button></div>`;
        $('#pick').addEventListener('click', () => this.openSourcePicker());
      } else {
        stage.innerHTML = `<div class="center">
           <h2>${esc(setterName)} is setting a question…</h2>
          <div class="spinner"></div></div>`;
      }
      return;
    }

    if (s.phase === 'answering') {
      const q = s.question;
      const remaining = Math.max(0, Math.ceil((s.endTs - Date.now()) / 1000));
      const pct = Math.max(0, (remaining / CONFIG.ROUND_SECONDS) * 100);
      const answered = this.answers.filter(a => a.round === s.round).length;
      const total = this.present().filter(p => p.id !== s.setterId).length;
      const locked = this.myAnswered || iAmSetter;
      const myAns = this.answers.find(a => a.round === s.round && a.userId === this.me.id);
      const reveal = (this.myAnswered && !iAmSetter)
        ? `<div class="reveal ${myAns && myAns.choiceIndex === q.correctIndex ? 'good' : 'bad'}">
             <div class="correct">✓ ${rich(q.options[q.correctIndex])}</div>${expBlock(q)}</div>`
        : '';
      stage.innerHTML = `
        <div class="timerbar"><div class="fill" style="width:${pct}%"></div></div>
         <div class="thead"><span class="pill">Question</span>
          <span class="clock">⏱ ${remaining}s</span>
          <span class="muted">${answered}/${total} answered</span></div>
         <h2 class="qtext">${rich(q.text)}${imageBlock(q)}</h2>
        <div class="opts">${q.options.map((o, i) =>
          `<button class="opt ${locked && i === q.correctIndex ? 'is-correct' : ''}" data-i="${i}" ${locked ? 'disabled' : ''}>${rich(o)}</button>`).join('')}</div>
        ${iAmSetter ? `<p class="muted">You set this question — watch the others answer.</p>${expBlock(q)}`
          : (this.myAnswered ? '<p class="ok">Answer locked in! Waiting for others…</p>' + reveal : '')}`;
      if (!locked) stage.querySelectorAll('.opt').forEach(b =>
        b.addEventListener('click', () => this.submitMyAnswer(Number(b.dataset.i))));
      return;
    }

    if (s.phase === 'results') {
      const q = s.question;
      stage.innerHTML = `<div class="center"><span class="pill">Question results</span>
        <h2>Correct answer</h2>
        <div class="correct">${rich(q.options[q.correctIndex])}</div>
        ${expBlock(q)}
        <p class="muted">Next turn starting soon…</p></div>`;
    }
  }

  showResultsPopup(s) {
    const q = s.question;
    const rows = this.answers.filter(a => a.round === s.round)
      .map(a => ({ ...a, correct: a.choiceIndex === q.correctIndex }))
      .sort((a, b) => (b.correct - a.correct) || (a.answeredAt - b.answeredAt));
    const body = rows.map((a, i) => {
      const pts = a.correct
        ? (a.points != null ? a.points
          : Math.max(CONFIG.MIN_CORRECT_POINTS,
            Math.round(CONFIG.BASE_POINTS * Math.max(0, (s.endTs - a.answeredAt)/1000) / CONFIG.ROUND_SECONDS)))
        : 0;
      return `<div class="res-row ${a.correct ? 'good' : 'bad'}">
        <span class="pos">${a.correct ? '#'+(i+1) : '—'}</span>
        <img class="av" src="${esc(a.avatar)}"/><span class="nm">${esc(a.name)}</span>
        <span class="tag">${a.correct ? 'Correct' : 'Wrong'}</span>
        <span class="pts">+${pts}</span></div>`;
    }).join('') || '<p class="muted">No one answered this round.</p>';
     this.modal(`<h2>Question rankings</h2>
      <p class="muted">Correct answer: <b>${rich(q.options[q.correctIndex])}</b></p>
      ${expBlock(q)}
      <div class="results">${body}</div>`, true);
    clearTimeout(this._popupT);
    this._popupT = setTimeout(() => this.closeModal(), CONFIG.RESULTS_SECONDS * 1000);
  }

  // ---------- settings ----------
  openSettings() {
    this.modal(`<h2>⚙️ Settings</h2>
      <label>AI Provider</label>
      <select id="set-prov">
         <option value="gemini" ${LS.provider==='gemini'?'selected':''}>Google Gemini (default)</option>
        <option value="openai" ${LS.provider==='openai'?'selected':''}>OpenAI (GPT)</option>
         <option value="groq" ${LS.provider==='groq'?'selected':''}>Groq AI</option>
      </select>
      <label>Your API Key</label>
      <input id="set-key" type="password" value="${esc(LS.key)}" placeholder="gsk_... / sk-... / AIza..." />
       <p class="muted">The selected provider and key are saved to your Supabase profile and reused across the site.</p>
      <button class="primary" id="set-save">Save</button>`);
    $('#set-save', this.modalEl).addEventListener('click', async () => {
      LS.provider = $('#set-prov', this.modalEl).value;
      LS.key = $('#set-key', this.modalEl).value.trim();
       if (LS.key && window.AIKeyManager) {
         await window.AIKeyManager.saveAISettings(LS.provider, LS.key);
       } else if (typeof this.net.saveApiKey === 'function') {
         await this.net.saveApiKey(LS.provider, LS.key);
       }
      this.closeModal(); this.toast('Settings saved');
    });
  }

  // ---------- modal + toast helpers ----------
  modal(html, dismissable = true, backHandler = null) {
    this.closeModal();
    const root = $('#modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal">
      ${backHandler ? '<button class="modal-back" type="button" aria-label="Back">←</button>' : ''}
      <button class="x" aria-label="close">✕</button>
      <div class="modal-body">${html}</div></div>`;
    root.appendChild(wrap);
    this.modalEl = wrap.querySelector('.modal-body');
    wrap.querySelector('.x').addEventListener('click', () => this.closeModal());
    if (backHandler) wrap.querySelector('.modal-back').addEventListener('click', backHandler);
    if (dismissable) wrap.addEventListener('click', (e) => { if (e.target === wrap) this.closeModal(); });
  }
  closeModal() { const r = $('#modal-root'); if (r) r.innerHTML = ''; this.modalEl = null; }
  toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  async leave() {
    clearInterval(this._tick);
    if (typeof this.net.leave === 'function') await this.net.leave();
  }
}
