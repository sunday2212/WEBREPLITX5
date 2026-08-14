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
      const { data } = await this.sb.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        name = data.name || name;
        avatar = data.avatar_url || avatar;
        college = data.college || '';
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

  async saveApiKey(provider, key) {
    try {
      await this.sb.from('user_settings').upsert({
        user_id: this.me.id, ai_provider: provider, ai_api_key: key,
      });
    } catch (e) { /* non-fatal: key still saved in localStorage */ }
  }

  async loadApiKey() {
    try {
      const { data } = await this.sb.from('user_settings').select('*').eq('user_id', this.me.id).single();
      return data || null;
    } catch (e) { return null; }
  }

  // ---- question sources backed by Supabase ----
  async getBookmarks() {
    const { data } = await this.sb.from('quiz_bookmarks').select('*').eq('user_id', this.me.id);
    return (data || []).map(b => b.question);
  }
  async getBankFilters() {
    const { data } = await this.sb.from('question_bank').select('subject,chapter,folder');
    return data || [];
  }
  async getBankQuestions(filter) {
    let q = this.sb.from('question_bank').select('*');
    if (filter.subject) q = q.eq('subject', filter.subject);
    if (filter.chapter) q = q.eq('chapter', filter.chapter);
    if (filter.folder) q = q.eq('folder', filter.folder);
    const { data } = await q.limit(100);
    return (data || []).map(r => ({ text: r.text, options: r.options, correctIndex: r.correct_index,
      subject: r.subject, chapter: r.chapter, folder: r.folder }));
  }
  async getFolders() {
    const { data } = await this.sb.from('question_bank').select('folder');
    return [...new Set((data || []).map(r => r.folder).filter(Boolean))];
  }
}
