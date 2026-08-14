# Quiz Battle — Real-Time Multiplayer MCQ Game (PRD)

## Problem statement
A real-time multiplayer MCQ game ("Quiz Battle") inside the existing medical MCQ platform (WEBREPLITX5).
Turn rotation: a Question Setter picks a question, others answer within 60s. Ephemeral, presence-tied
points. Leaderboard with pic/name/college/points/rank. Mobile responsive. Must not break Google AutoAds.
Stack: plain HTML/CSS/JS + Supabase JS client. AI via user's Groq key (profiles.groq_api_key).

## Architecture
- Static multipage site served by **Vite dev server on port 3000** (supervisor `yarn start` -> `vite --host 0.0.0.0 --port 3000`).
- Quiz game at `/quizx/quiz game/` (index.html, game.js, ai.js, qbank.js, config.js, net-supabase.js, net-demo.js).
- Question banks: file-based JSON under `/quizx/Brain/` + `file-manifest.json`.
- AI Question Bank subjects/chapters come from `/quizx/Aiquiz/js/config.js` (`SUBJECTS`).
- Supabase tables: profiles, quiz_bookmarks, game_rooms, round_answers (user runs schema.sql).

## Implemented (2026-06)
### Fork bug-fix batch (all verified via testing_agent — iteration_3.json, 100%)
1. **Question-bank HTML now renders** (was showing raw `<p><span…>` code). `game.js` `rich()` = DOM
   allowlist sanitizer (safe formatting tags + IMG https src; strips style/script/iframe/svg/inline
   styles/event handlers). Applied to question text, options, results, results popup. Images scale via CSS.
2. **AI merged into Manual Entry** — removed the separate "AI Auto-Generate" source. Manual Entry has an
   "✨ AI Generate / Fix" button (`#m-ai`) + Explanation field (`#m-exp`):
   - question+options filled -> AI proof-reads/corrects (NEET PG medical knowledge)
   - only question -> AI generates options + correct answer + explanation
   - blank -> AI generates a random NEET PG question
   (No key -> falls back to sample question that still populates the form.)
3. **Explanation shown after answering** and in results (carried on the question object as `explanation`).
4. **AI Question Bank uses Subject + Chapter dropdowns** from Aiquiz `SUBJECTS` (`#b-sub` -> `#b-chap`).

### Infra fixes this fork
- Frontend was down: added missing `start` script; installed deps (`yarn install --ignore-engines`).
- Vite crashed with ENOSPC (inotify) watching thousands of Brain JSONs -> `vite.config.js` narrows
  `server.watch.ignored` to quizx/Brain, quizx/prepladder, quizx/marrow, 1234xxx (keeps quiz game + Aiquiz
  watched so code edits hot-reload). Added `server.allowedHosts: true` (preview domain host-check 403 fix).

## Key files
- `/app/frontend/quizx/quiz game/game.js` — controller + rich() sanitizer + forms + rendering
- `/app/frontend/quizx/quiz game/ai.js` — aiManual(), aiBank(), parseMCQ() (+explanation)
- `/app/frontend/quizx/Aiquiz/js/config.js` — SUBJECTS
- `/app/frontend/vite.config.js` — dev server watch/host config
- `/app/frontend/package.json` — `start` script

## User verification still pending (LIVE / Supabase login only)
- Real question-bank HTML rendering from Brain JSON + Bookmarks source (needs Google login; same rich() path).
- Running `schema.sql` in Supabase for game_rooms/round_answers (multiplayer out of demo mode).

## Backlog / P1
- Per-round difficulty (Easy/Medium/Hard) using Aiquiz DIFFICULTY_LEVELS for AI generation.
- Setter question preview before starting the round.
