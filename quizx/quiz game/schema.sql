-- ============================================================================
-- QUIZ BATTLE — SAFE schema for an EXISTING project (WEBREPLITX5).
-- Only adds the 2 new game tables. Does NOT touch profiles, quiz_bookmarks,
-- auth, or your file-based question bank. Idempotent (safe to re-run).
-- Run in Supabase Dashboard -> SQL Editor.
-- (Make sure Auth -> Providers -> Google is already enabled.)
-- ============================================================================

-- 1) SHARED ROOM STATE (one row per room), broadcast to all clients via Realtime
create table if not exists public.game_rooms (
  id text primary key,
  phase text default 'lobby',            -- lobby | setting | answering | results
  round_no int default 0,
  setter_id uuid,
  question jsonb,                         -- { text, options[4], correctIndex }
  start_ts timestamptz,
  end_ts timestamptz,
  updated_at timestamptz default now()
);
insert into public.game_rooms (id, phase) values ('main','lobby')
  on conflict (id) do nothing;

-- 2) PER-ROUND ANSWERS
create table if not exists public.round_answers (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  round_no int not null,
  user_id uuid not null,                  -- = auth.uid()
  name text,
  avatar text,
  choice_index int,
  points int,
  answered_at timestamptz default now()
);
create index if not exists idx_answers_room_round on public.round_answers(room_id, round_no);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY (only for the 2 new tables)
-- ---------------------------------------------------------------------------
alter table public.game_rooms    enable row level security;
alter table public.round_answers enable row level security;

drop policy if exists "rooms read"  on public.game_rooms;
drop policy if exists "rooms write" on public.game_rooms;
create policy "rooms read"  on public.game_rooms for select using (true);
create policy "rooms write" on public.game_rooms for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "answers read" on public.round_answers;
drop policy if exists "answers ins"  on public.round_answers;
create policy "answers read" on public.round_answers for select using (true);
create policy "answers ins"  on public.round_answers for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ENABLE REALTIME on both tables
-- ---------------------------------------------------------------------------
alter table public.game_rooms    replica identity full;
alter table public.round_answers replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.game_rooms;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.round_answers;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- NOTES:
--  * AI key           -> read/written to existing profiles.groq_api_key (Groq).
--  * Leaderboard data -> existing profiles (name, college, profile_pic_url).
--  * Bookmarks        -> existing quiz_bookmarks (file_path + question_index),
--                        resolved from your JSON files at runtime.
--  * Question bank    -> your existing JSON files + manifest (no DB table).
-- ============================================================================
