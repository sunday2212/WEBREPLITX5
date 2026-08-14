# Quiz Battle — Real-Time Multiplayer MCQ Game

Drop this folder into your `quizx/` directory in **WEBREPLITX5**. It is plain
HTML/CSS/JS + Supabase JS client — no build step.

```
quizx/quiz game/
├── index.html          # the game room page
├── styles.css          # responsive UI (mobile / tablet / desktop)
├── config.js           # <-- put your Supabase URL + anon key here
├── game.js             # turn rotation, 60s timer, scoring, UI, question sources
├── ai.js               # AI MCQ generation (OpenAI / Gemini) + sample bank
├── net-supabase.js     # real multiplayer backend (Presence + Realtime)
├── net-demo.js         # in-memory demo backend (3 simulated players)
├── schema.sql          # run this in Supabase SQL Editor
└── README.md
```

## Quick try (Demo Mode)
Open `index.html` (or serve the folder with any static server). With no Supabase
keys set, it runs in **DEMO MODE**: you + 3 bots, full turn/timer/scoring loop,
all 5 question sources, results popup and leaderboard.

## Go live (real multiplayer)
1. In Supabase: **Auth → Providers → Google** → enable and add your OAuth creds.
2. Open **SQL Editor**, paste and run `schema.sql`.
3. Edit `config.js` → set `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
   (The app auto-switches from DEMO to LIVE once these are filled.)
4. Host the folder (same origin as your site). On load, users are sent through
   Google sign-in, then land in the room.

### How it maps to your existing site
- **Profile pic / name / college**: read from `public.profiles` (auto-populated
  from Google metadata via the trigger in `schema.sql`). If you already have a
  profiles table, keep it — just ensure columns `name`, `college`, `avatar_url`.
- **Bookmarks**: `quiz_bookmarks(user_id, question jsonb)`.
- **AI Question Bank** (subject/chapter/topic) and **Question Bank Folder**
  dropdown: `question_bank(subject, chapter, folder, topic, text, options, correct_index)`.
  Point these at your existing bank tables if names differ (edit `net-supabase.js`).

## Game rules (current defaults — easy to change in `config.js`)
- Turns rotate between online players; the current player is the **Question Setter**.
- Setter picks a question via: Manual · AI Auto-Generate · Bookmarks · AI Question
  Bank · Question Bank Folder.
- **60s** countdown for everyone else. Round ends at 60s **or** when all online
  players have answered.
- **Scoring:** correct = `max(100, round(1000 × remaining/60))`; wrong = 0.
- Results popup shows correct answer + who answered correctly, in order, with points.

## Presence & points (ephemeral)
Scores live inside **Supabase Realtime Presence**, not a persistent balance.
Leaving / disconnecting removes you from the leaderboard and your session points
are **lost** (reset to 0 if you rejoin). Only continuously-online users rank.

## AI key
Each user adds their own key in **⚙️ Settings** (OpenAI or Gemini). It is stored in
`localStorage` and, when live, mirrored to `user_settings` in Supabase.

## Google AdSense
Layout is auto-ads friendly (normal document flow, scrollable body, no full-screen
lock). To show a manual slot, set `ADSENSE_CLIENT` in `config.js` and uncomment the
AdSense script in `index.html`.
