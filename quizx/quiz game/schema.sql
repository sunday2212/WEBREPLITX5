-- ============================================================================
-- Quiz Game schema for Supabase. Run this in Supabase SQL Editor.
-- Assumes Google OAuth is enabled (Auth -> Providers -> Google).
-- ============================================================================

-- 1) Profiles (populated on Google sign-up). If you already have a profiles
--    table, keep yours — just make sure it has: id, name, college, avatar_url.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  college text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create a profile row on new signup using Google metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.email),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) Shared room state (one row per room). Synced to all clients via Realtime.
create table if not exists public.game_rooms (
  id text primary key,
  phase text default 'lobby',           -- lobby | setting | answering | results
  round_no int default 0,
  setter_id uuid,
  question jsonb,                        -- { text, options[4], correctIndex }
  start_ts timestamptz,
  end_ts timestamptz,
  updated_at timestamptz default now()
);
insert into public.game_rooms (id, phase) values ('main','lobby')
  on conflict (id) do nothing;

-- 3) Per-round answers
create table if not exists public.round_answers (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  round_no int not null,
  user_id uuid not null,
  name text,
  avatar text,
  choice_index int,
  points int,
  answered_at timestamptz default now()
);
create index if not exists idx_answers_room_round on public.round_answers(room_id, round_no);

-- 4) Bookmarked questions per user
create table if not exists public.quiz_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question jsonb not null,               -- { text, options[4], correctIndex }
  created_at timestamptz default now()
);

-- 5) Question bank (subject / chapter / folder driven) — map to your existing one
create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  subject text,
  chapter text,
  folder text,                           -- "Latest Question Bank Folder"
  topic text,
  text text not null,
  options jsonb not null,                -- ["a","b","c","d"]
  correct_index int not null default 0
);

-- 6) Optional: save the user's own AI API key
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ai_provider text default 'openai',
  ai_api_key text
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.game_rooms     enable row level security;
alter table public.round_answers  enable row level security;
alter table public.quiz_bookmarks enable row level security;
alter table public.question_bank  enable row level security;
alter table public.user_settings  enable row level security;

-- profiles: everyone can read (for leaderboard names/college/avatar)
create policy "profiles read"  on public.profiles for select using (true);
create policy "profiles upd"   on public.profiles for update using (auth.uid() = id);
create policy "profiles ins"   on public.profiles for insert with check (auth.uid() = id);

-- game_rooms: any authenticated player can read & write shared room state
create policy "rooms read"  on public.game_rooms for select using (true);
create policy "rooms write" on public.game_rooms for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- round_answers: readable by all, insertable by the answering user
create policy "answers read" on public.round_answers for select using (true);
create policy "answers ins"  on public.round_answers for insert
  with check (auth.uid() = user_id);

-- bookmarks: private to owner
create policy "bm all" on public.quiz_bookmarks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- question_bank: readable by all authenticated users
create policy "bank read" on public.question_bank for select using (true);

-- user_settings: private to owner
create policy "settings all" on public.user_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Enable Realtime for the tables the clients subscribe to
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.game_rooms;
alter publication supabase_realtime add table public.round_answers;
