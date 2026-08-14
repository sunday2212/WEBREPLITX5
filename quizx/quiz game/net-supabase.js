// ============================================================================
// SupabaseNet - real multiplayer backend using Supabase Auth (Google OAuth),
// Realtime Presence (ephemeral live scores) and a game_rooms row + round_answers
// table synced via Postgres Changes. Requires schema.sql to be applied.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CONFIG } from './config.js';

export class SupabaseNet {
  constructor() {
    this.sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    this.me = null;
    this.channel = null;
    this._players = [];
    this._state = null;
    this._answers = [];
    this._cb = {};
    this._score = 0;
  }

  async ensureAuth() {
    const { data } = await this.sb.auth.getUser();
    if (data?.user) return data.user;
    // Trigger Google OAuth; returns to this page after login.
    await this.sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
    return null; // page will redirect
  }

  async loadProfile(user) {
    let name = user.user_metadata?.full_name || user.email || 'Player';
    let avatar = user.user_metadata?.avatar_url || '';
    let college = '';
    try {
      const { data } = await this.sb.from('profiles')
        .select('name, college, profile_pic_url, groq_api_key').eq('id', user.id).single();
      if (data) {
        name = data.name || name;
        avatar = data.profile_pic_url || avatar;   // your column is profile_pic_url
        college = data.college || '';
        this.groqKey = data.groq_api_key || '';     // key already in profile bar
      }
    } catch (e) { /* profiles row may not exist yet */ }
    return { id: user.id, name, college, avatar };
  }

  async init(callbacks) {
    this._cb = callbacks || {};
    const user = await this.ensureAuth();
    if (!user) return { me: null, redirecting: true };
    this.me = await this.loadProfile(user);

    // Realtime presence channel (ephemeral scores)
    this.channel = this.sb.channel(`room:${CONFIG.ROOM_ID}`, {
      config: { presence: { key: this.me.id } },
    });

    this.channel.on('presence', { event: 'sync' }, () => {
      const st = this.channel.presenceState();
      const list = [];
      Object.keys(st).forEach(k => {
        const meta = st[k][0];
        if (meta) list.push({ ...meta });
      });
      this._players = list;
      this._cb.onPlayers && this._cb.onPlayers(this.players());
    });

    // Room state changes
    this.channel.on('postgres_changes',
      { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${CONFIG.ROOM_ID}` },
      (payload) => {
        this._state = payload.new || null;
        this._cb.onRoomState && this._cb.onRoomState(this.getRoomState());
      });

    // Answers stream
    this.channel.on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'round_answers', filter: `room_id=eq.${CONFIG.ROOM_ID}` },
      (payload) => {
        this._answers.push(this._mapAnswer(payload.new));
        this._cb.onAnswers && this._cb.onAnswers(this.getAnswers());
      });

    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel.track({
          id: this.me.id, name: this.me.name, college: this.me.college,
          avatar: this.me.avatar, score: 0, joinedAt: Date.now(),
        });
        await this._loadRoom();
      }
    });

    return { me: this.me };
  }

  _mapAnswer(r) {
    return { round: r.round_no, userId: r.user_id, name: r.name, avatar: r.avatar,
      choiceIndex: r.choice_index, answeredAt: new Date(r.answered_at).getTime(),
      points: r.points };
  }

  async _loadRoom() {
    const { data } = await this.sb.from('game_rooms').select('*').eq('id', CONFIG.ROOM_ID).single();
    if (data) { this._state = data; this._cb.onRoomState && this._cb.onRoomState(this.getRoomState()); }
  }

  players() {
    return this._players
      .map(p => ({ id: p.id, name: p.name, college: p.college, avatar: p.avatar,
        score: p.score || 0, joinedAt: p.joinedAt || 0 }))
      .sort((a, b) => a.joinedAt - b.joinedAt);
  }

  isHost() {
    const list = this.players();
    return list.length > 0 && list[0].id === this.me.id; // earliest-joined is host
  }

  getRoomState() {
    if (!this._state) return null;
    const s = this._state;
    return {
      phase: s.phase, round: s.round_no, setterId: s.setter_id,
      question: s.question, startTs: s.start_ts ? new Date(s.start_ts).getTime() : null,
      endTs: s.end_ts ? new Date(s.end_ts).getTime() : null,
    };
  }

  getAnswers() { return this._answers.map(a => ({ ...a })); }

  async setScore(id, score) {
    if (id !== this.me.id) return; // each client owns its presence score
    this._score = score;
    await this.channel.track({
      id: this.me.id, name: this.me.name, college: this.me.college,
      avatar: this.me.avatar, score, joinedAt: this._joinedAt || Date.now(),
    });
  }

  async submitAnswer(ans) {
    await this.sb.from('round_answers').insert({
      room_id: CONFIG.ROOM_ID, round_no: ans.round, user_id: ans.userId,
      name: ans.name, avatar: ans.avatar, choice_index: ans.choiceIndex,
      answered_at: new Date(ans.answeredAt).toISOString(),
    });
  }

  async setRoomState(state) {
    // host writes shared room state
    await this.sb.from('game_rooms').upsert({
      id: CONFIG.ROOM_ID, phase: state.phase, round_no: state.round,
      setter_id: state.setterId, question: state.question,
      start_ts: state.startTs ? new Date(state.startTs).toISOString() : null,
      end_ts: state.endTs ? new Date(state.endTs).toISOString() : null,
    });
  }

  async leave() {
    try { await this.channel.untrack(); await this.sb.removeChannel(this.channel); } catch (e) { /* ignore */ }
  }

  // The user's AI key already lives in profiles.groq_api_key (the profile bar).
  async saveApiKey(provider, key) {
    try {
      await this.sb.from('profiles').update({ groq_api_key: key }).eq('id', this.me.id);
      this.groqKey = key;
    } catch (e) { /* non-fatal: key still saved in localStorage */ }
  }

  async loadApiKey() {
    return { ai_provider: CONFIG.DEFAULT_AI_PROVIDER, ai_api_key: this.groqKey || '' };
  }

  // ---- file-based question sources (your bank/bookmarks are JSON files) ----
  _fileUrl(filePath) {
    const base = CONFIG.QUESTION_FILE_BASE || (window.location.origin + '/');
    try { return new URL(filePath, base).href; }
    catch (e) { return base.replace(/\/$/, '') + '/' + String(filePath).replace(/^\//, ''); }
  }

  async _loadFile(filePath) {
    if (!this._fileCache) this._fileCache = {};
    if (this._fileCache[filePath]) return this._fileCache[filePath];
    const res = await fetch(this._fileUrl(filePath));
    if (!res.ok) throw new Error('Cannot load ' + filePath);
    let json = await res.json();
    // questions may be at top-level array or under a key
    const arr = Array.isArray(json) ? json
      : (json.questions || json.data || json.items || json.mcqs || []);
    this._fileCache[filePath] = arr;
    return arr;
  }

  // Bookmarks store a reference (file_path + question_index); resolve to a real Q.
  async getBookmarks() {
    const { normalizeQuestion } = await import('./ai.js');
    const { data } = await this.sb.from('quiz_bookmarks')
      .select('file_path, question_index, q_no, topic_name, folder_path')
      .eq('user_id', this.me.id).order('bookmarked_at', { ascending: false }).limit(50);
    const out = [];
    for (const b of (data || [])) {
      try {
        const arr = await this._loadFile(b.file_path);
        const raw = arr[b.question_index];
        const q = normalizeQuestion(raw);
        if (q && q.text) out.push(q);
      } catch (e) { /* skip unresolved bookmark */ }
    }
    return out;
  }

  // "Question Bank Folder" dropdown, driven by your manifest / metadata JSON.
  // Returns folder identifiers (path/label). Structure-tolerant.
  async getFolders() {
    if (!CONFIG.MANIFEST_URL) return [];
    try {
      const res = await fetch(CONFIG.MANIFEST_URL);
      const m = await res.json();
      const files = this._manifestFiles(m);
      const folders = new Set();
      files.forEach(f => {
        const p = (f.folder || f.path || f.file_path || f);
        const dir = String(p).split('/').slice(0, -1).join('/');
        if (dir) folders.add(dir);
      });
      this._manifest = files;
      return [...folders].sort();
    } catch (e) { return []; }
  }

  // Given a folder, return normalized questions from files in that folder.
  async getBankQuestions(filter) {
    const { normalizeQuestion } = await import('./ai.js');
    if (!this._manifest) await this.getFolders();
    const files = (this._manifest || []).filter(f => {
      const p = String(f.path || f.file_path || f.folder || f);
      return !filter.folder || p.startsWith(filter.folder);
    });
    const out = [];
    for (const f of files.slice(0, 5)) {
      const fp = f.path || f.file_path || f;
      try {
        const arr = await this._loadFile(fp);
        arr.slice(0, 30).forEach(raw => {
          const q = normalizeQuestion(raw);
          if (q && q.text) out.push({ ...q, folder: filter.folder });
        });
      } catch (e) { /* skip */ }
    }
    return out;
  }

  // Extract a flat file list from various manifest shapes.
  _manifestFiles(m) {
    if (Array.isArray(m)) return m;
    if (m.files) return m.files;
    if (m.manifest) return m.manifest;
    // nested tree -> flatten any {path/file_path} leaves
    const out = [];
    const walk = (node) => {
      if (!node) return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (typeof node === 'object') {
        if (node.path || node.file_path) out.push(node);
        Object.values(node).forEach(walk);
      }
    };
    walk(m);
    return out;
  }
}
