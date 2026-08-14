// ============================================================================
// Game controller: turn rotation, 60s round timer, scoring, question sourcing
// and all UI rendering. Backend-agnostic (works with DemoNet or SupabaseNet).
// ============================================================================

import { CONFIG } from './config.js';
import { generateMCQ, randomFromBank, SAMPLE_BANK } from './ai.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LS = {
  get provider() { return localStorage.getItem('qg_provider') || 'openai'; },
  set provider(v) { localStorage.setItem('qg_provider', v); },
  get key() { return localStorage.getItem('qg_apikey') || ''; },
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
  }

  async start() {
    const res = await this.net.init({
      onPlayers: (p) => { this.players = p; this.renderLeaderboard(); this.maybeHostBootstrap(); },
      onRoomState: (s) => this.onRoomState(s),
      onAnswers: (a) => { this.answers = a; this.onAnswersUpdate(); },
    });
    if (res && res.redirecting) return; // OAuth redirect in progress
    this.me = this.net.me;
    this.renderHeader();
    this.maybeHostBootstrap();
    this._tick = setInterval(() => this.hostLoop(), 1000);
  }

  // ---------- host orchestration ----------
  present() { return this.players.slice(); }

  maybeHostBootstrap() {
    if (!this.me || !this.net.isHost()) return;
    const s = this.net.getRoomState();
    if (!s || s.phase === 'lobby' || !s.phase) {
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
      <p class="muted">Pick how you want to set this round's MCQ.</p>
      <div class="source-grid">
        <button class="src" data-src="manual"><span>✍️</span>Manual Entry</button>
        <button class="src" data-src="ai"><span>✨</span>AI Auto-Generate</button>
        <button class="src" data-src="bookmarks"><span>⭐</span>From Bookmarks</button>
        <button class="src" data-src="bank"><span>📚</span>AI Question Bank</button>
        <button class="src" data-src="folder"><span>📁</span>Question Bank Folder</button>
      </div>`);
    this.modalEl.querySelectorAll('.src').forEach(b =>
      b.addEventListener('click', () => this.handleSource(b.dataset.src)));
  }

  handleSource(src) {
    if (src === 'manual') return this.formManual();
    if (src === 'ai') return this.formAI();
    if (src === 'bookmarks') return this.listBookmarks();
    if (src === 'bank') return this.formBank();
    if (src === 'folder') return this.formFolder();
  }

  formManual() {
    this.modal(`<h2>Manual Entry</h2>
      <label>Question</label><input id="m-q" placeholder="Type your question" />
      ${[0,1,2,3].map(i => `<label>Option ${i+1} <input type="radio" name="m-c" value="${i}" ${i===0?'checked':''}/> correct</label>
        <input id="m-o${i}" placeholder="Option ${i+1}" />`).join('')}
      <button class="primary" id="m-go">Start Round</button>`);
    $('#m-go', this.modalEl).addEventListener('click', () => {
      const text = $('#m-q', this.modalEl).value.trim();
      const options = [0,1,2,3].map(i => $('#m-o'+i, this.modalEl).value.trim());
      const correctIndex = Number(this.modalEl.querySelector('input[name="m-c"]:checked').value);
      if (!text || options.some(o => !o)) return this.toast('Fill question and all 4 options');
      this.commitQuestion({ text, options, correctIndex });
    });
  }

  formAI() {
    const configured = !!LS.key;
    this.modal(`<h2>AI Auto-Generate</h2>
      ${configured ? '' : '<p class="warn">No API key saved. Add one in Settings (⚙️) or a sample question will be used.</p>'}
      <label>Topic (optional)</label><input id="ai-topic" placeholder="e.g. Photosynthesis" />
      <p class="muted">Provider: <b>${esc(LS.provider)}</b></p>
      <button class="primary" id="ai-go">Generate & Start</button>`);
    $('#ai-go', this.modalEl).addEventListener('click', async () => {
      $('#ai-go', this.modalEl).disabled = true;
      $('#ai-go', this.modalEl).textContent = 'Generating...';
      try {
        const q = await generateMCQ($('#ai-topic', this.modalEl).value.trim(), LS.provider, LS.key);
        this.commitQuestion(q);
      } catch (e) { this.toast('AI failed: ' + e.message); this.formAI(); }
    });
  }

  async listBookmarks() {
    let items = [];
    if (typeof this.net.getBookmarks === 'function') items = await this.net.getBookmarks();
    if (!items.length) items = SAMPLE_BANK.slice(0, 4); // demo fallback
    this.modal(`<h2>From Bookmarks</h2>${items.length ? '' : '<p class="muted">No bookmarks found.</p>'}
      <div class="list">${items.map((q,i) =>
        `<button class="row" data-i="${i}">${esc(q.text)}</button>`).join('')}</div>`);
    this.modalEl.querySelectorAll('.row').forEach(b =>
      b.addEventListener('click', () => this.commitQuestion(items[b.dataset.i])));
  }

  async formBank() {
    const subjects = [...new Set(SAMPLE_BANK.map(q => q.subject))];
    this.modal(`<h2>AI Question Bank</h2>
      <label>Subject</label><select id="b-sub"><option value="">Any</option>
        ${subjects.map(s => `<option>${esc(s)}</option>`).join('')}</select>
      <label>Chapter</label><input id="b-chap" placeholder="optional" />
      <label>Topic</label><input id="b-top" placeholder="optional" />
      <button class="primary" id="b-go">Pick a question</button>`);
    $('#b-go', this.modalEl).addEventListener('click', async () => {
      const filter = { subject: $('#b-sub', this.modalEl).value,
        chapter: $('#b-chap', this.modalEl).value.trim() };
      let q;
      if (typeof this.net.getBankQuestions === 'function') {
        const list = await this.net.getBankQuestions(filter);
        q = list.length ? list[Math.floor(Math.random()*list.length)] : randomFromBank(filter);
      } else q = randomFromBank(filter);
      this.commitQuestion(q);
    });
  }

  async formFolder() {
    let folders = [];
    if (typeof this.net.getFolders === 'function') folders = await this.net.getFolders();
    if (!folders.length) folders = [...new Set(SAMPLE_BANK.map(q => q.chapter))];
    this.modal(`<h2>Latest Question Bank Folder</h2>
      <label>Choose folder</label>
      <select id="f-sel">${folders.map(f => `<option>${esc(f)}</option>`).join('')}</select>
      <div id="f-list" class="list"></div>`);
    const load = async () => {
      const folder = $('#f-sel', this.modalEl).value;
      let items = [];
      if (typeof this.net.getBankQuestions === 'function')
        items = await this.net.getBankQuestions({ folder });
      if (!items.length) items = SAMPLE_BANK.filter(q => q.chapter === folder);
      $('#f-list', this.modalEl).innerHTML = items.map((q,i) =>
        `<button class="row" data-i="${i}">${esc(q.text)}</button>`).join('') || '<p class="muted">Empty folder</p>';
      this.modalEl.querySelectorAll('#f-list .row').forEach(b =>
        b.addEventListener('click', () => this.commitQuestion(items[b.dataset.i])));
    };
    $('#f-sel', this.modalEl).addEventListener('change', load);
    load();
  }

  async commitQuestion(q) {
    this.closeModal();
    if (!q || !q.options || q.options.length !== 4) return this.toast('Invalid question');
    await this.startAnswering({ text: q.text, options: q.options, correctIndex: q.correctIndex });
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
        stage.innerHTML = `<div class="center"><span class="pill">Round ${s.round}</span>
          <h2>It’s your turn!</h2><p class="muted">Set a question for everyone.</p>
          <button class="primary big" id="pick">Choose a question</button></div>`;
        $('#pick').addEventListener('click', () => this.openSourcePicker());
      } else {
        stage.innerHTML = `<div class="center"><span class="pill">Round ${s.round}</span>
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
      stage.innerHTML = `
        <div class="timerbar"><div class="fill" style="width:${pct}%"></div></div>
        <div class="thead"><span class="pill">Round ${s.round}</span>
          <span class="clock">⏱ ${remaining}s</span>
          <span class="muted">${answered}/${total} answered</span></div>
        <h2 class="qtext">${esc(q.text)}</h2>
        <div class="opts">${q.options.map((o, i) =>
          `<button class="opt" data-i="${i}" ${locked ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>
        ${iAmSetter ? '<p class="muted">You set this question — watch the others answer.</p>'
          : (this.myAnswered ? '<p class="ok">Answer locked in! Waiting for others…</p>' : '')}`;
      if (!locked) stage.querySelectorAll('.opt').forEach(b =>
        b.addEventListener('click', () => this.submitMyAnswer(Number(b.dataset.i))));
      return;
    }

    if (s.phase === 'results') {
      const q = s.question;
      stage.innerHTML = `<div class="center"><span class="pill">Round ${s.round} results</span>
        <h2>Correct answer</h2>
        <div class="correct">${esc(q.options[q.correctIndex])}</div>
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
    this.modal(`<h2>Round ${s.round} Rankings</h2>
      <p class="muted">Correct answer: <b>${esc(q.options[q.correctIndex])}</b></p>
      <div class="results">${body}</div>`, true);
    clearTimeout(this._popupT);
    this._popupT = setTimeout(() => this.closeModal(), CONFIG.RESULTS_SECONDS * 1000);
  }

  // ---------- settings ----------
  openSettings() {
    this.modal(`<h2>⚙️ Settings</h2>
      <label>AI Provider</label>
      <select id="set-prov">
        <option value="openai" ${LS.provider==='openai'?'selected':''}>OpenAI (GPT)</option>
        <option value="gemini" ${LS.provider==='gemini'?'selected':''}>Google Gemini</option>
      </select>
      <label>Your API Key</label>
      <input id="set-key" type="password" value="${esc(LS.key)}" placeholder="sk-... / AIza..." />
      <p class="muted">Stored locally in your browser${typeof this.net.saveApiKey==='function' ? ' and Supabase' : ''}.</p>
      <button class="primary" id="set-save">Save</button>`);
    $('#set-save', this.modalEl).addEventListener('click', async () => {
      LS.provider = $('#set-prov', this.modalEl).value;
      LS.key = $('#set-key', this.modalEl).value.trim();
      if (typeof this.net.saveApiKey === 'function')
        await this.net.saveApiKey(LS.provider, LS.key);
      this.closeModal(); this.toast('Settings saved');
    });
  }

  // ---------- modal + toast helpers ----------
  modal(html, dismissable = true) {
    this.closeModal();
    const root = $('#modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal"><button class="x" aria-label="close">✕</button>
      <div class="modal-body">${html}</div></div>`;
    root.appendChild(wrap);
    this.modalEl = wrap.querySelector('.modal-body');
    wrap.querySelector('.x').addEventListener('click', () => this.closeModal());
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
