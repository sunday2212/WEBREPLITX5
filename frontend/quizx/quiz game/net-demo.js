// ============================================================================
// DemoNet - an in-memory backend that simulates a multiplayer room with 3 bots.
// Lets you play/test the full game loop with zero setup. It exposes the same
// interface the game controller uses for the real Supabase backend.
// ============================================================================

import { CONFIG, calculateCorrectPoints } from './config.js';
import { randomFromBank } from './ai.js';

const avatar = (seed) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;

export class DemoNet {
  constructor() {
    this.me = {
      id: 'me',
      name: 'You',
      college: 'Your College',
      avatar: avatar('You-player'),
    };
    this._players = [
      { ...this.me, score: 0, joinedAt: 1 },
      { id: 'bot1', name: 'Aarav', college: 'IIT Delhi', avatar: avatar('Aarav'), score: 0, joinedAt: 2 },
      { id: 'bot2', name: 'Meera', college: 'BITS Pilani', avatar: avatar('Meera'), score: 0, joinedAt: 3 },
      { id: 'bot3', name: 'Kabir', college: 'NIT Trichy', avatar: avatar('Kabir'), score: 0, joinedAt: 4 },
    ];
    this._state = null;
    this._answers = [];
    this._cb = {};
    this._botTimers = [];
  }

  async init(callbacks) {
    this._cb = callbacks || {};
    setTimeout(() => this._cb.onPlayers && this._cb.onPlayers(this.players()), 30);
    return { me: this.me };
  }

  players() { return this._players.map(p => ({ ...p })); }
  isHost() { return true; } // in demo the single human drives the room
  getRoomState() { return this._state ? { ...this._state } : null; }
  getAnswers() { return this._answers.map(a => ({ ...a })); }

  setScore(id, score) {
    const p = this._players.find(x => x.id === id);
    if (p) p.score = score;
    this._cb.onPlayers && this._cb.onPlayers(this.players());
  }

  async submitAnswer(ans) {
    if (this._answers.find(a => a.userId === ans.userId && a.round === ans.round)) return;
    this._answers.push({ ...ans });
    this._cb.onAnswers && this._cb.onAnswers(this.getAnswers());
  }

  async clearAnswers() {
    this._answers = [];
    this._cb.onAnswers && this._cb.onAnswers(this.getAnswers(), { reset: true });
  }

  async setRoomState(state) {
    this._state = { ...state };
    this._clearBotTimers();
    if (state.phase === 'answering') {
      this._answers = this._answers.filter(a => a.round === state.round);
      this._scheduleBotAnswers(state);
    }
    if (state.phase === 'results') {
      this._botScore(state);
    }
    this._cb.onRoomState && this._cb.onRoomState(this.getRoomState());
  }

  // ---- bot behaviour (demo only) ----
  _scheduleBotAnswers(state) {
    const q = state.question;
    if (!q) return;
    this._players.filter(p => p.id !== 'me' && p.id !== state.setterId).forEach(bot => {
      const delay = 2000 + Math.random() * (CONFIG.ROUND_SECONDS * 1000 * 0.7);
      const t = setTimeout(() => {
        const correct = Math.random() < 0.6;
        const choiceIndex = correct
          ? q.correctIndex
          : (q.correctIndex + 1 + Math.floor(Math.random() * 3)) % 4;
        const answeredAt = Date.now();
        this.submitAnswer({
          round: state.round, userId: bot.id, name: bot.name,
          avatar: bot.avatar, choiceIndex, answeredAt,
          points: correct ? calculateCorrectPoints(answeredAt, state.endTs) : 0,
        });
      }, delay);
      this._botTimers.push(t);
    });
  }

  _botScore(state) {
    // award bot points based on their recorded answers for this round
    this._answers.filter(a => a.round === state.round && a.userId !== 'me').forEach(a => {
      const correct = a.choiceIndex === state.question.correctIndex;
      if (!correct) return;
      const pts = a.points != null
        ? a.points
        : calculateCorrectPoints(a.answeredAt, state.endTs);
      const bot = this._players.find(p => p.id === a.userId);
      if (bot) bot.score += pts;
      a.points = pts;
    });
    this._cb.onPlayers && this._cb.onPlayers(this.players());
  }

  _clearBotTimers() { this._botTimers.forEach(clearTimeout); this._botTimers = []; }
  async leave() {
    this._clearBotTimers();
    this._answers = this._answers.filter(a => a.userId !== this.me.id);
  }
}
