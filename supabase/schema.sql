-- Goal Diff Fantasy initial database schema
-- Run this in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  team_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.fantasy_leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season_name text not null default '2026/27',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.fantasy_leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (league_id, user_id)
);

create table if not exists public.fantasy_gameweeks (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.fantasy_leagues(id) on delete cascade,
  gameweek_number integer not null check (gameweek_number between 1 and 38),
  deadline_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'open', 'locked', 'scored')),
  created_at timestamptz not null default now(),
  unique (league_id, gameweek_number)
);

create table if not exists public.real_fixtures (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'football-data.org',
  provider_fixture_id text not null,
  competition_code text not null,
  competition_name text,
  season text,
  kickoff_at timestamptz,
  home_team_id text,
  home_team_name text not null,
  away_team_id text,
  away_team_name text not null,
  status text not null default 'SCHEDULED',
  home_score integer,
  away_score integer,
  raw_data jsonb,
  last_synced_at timestamptz not null default now(),
  unique (provider, provider_fixture_id)
);

create table if not exists public.gameweek_fixtures (
  id uuid primary key default gen_random_uuid(),
  fantasy_gameweek_id uuid not null references public.fantasy_gameweeks(id) on delete cascade,
  real_fixture_id uuid not null references public.real_fixtures(id) on delete cascade,
  display_order integer not null default 1,
  unique (fantasy_gameweek_id, real_fixture_id)
);

create table if not exists public.fantasy_matches (
  id uuid primary key default gen_random_uuid(),
  fantasy_gameweek_id uuid not null references public.fantasy_gameweeks(id) on delete cascade,
  home_user_id uuid not null references public.profiles(id) on delete cascade,
  away_user_id uuid not null references public.profiles(id) on delete cascade,
  home_score integer,
  away_score integer,
  result text check (result in ('home_win', 'away_win', 'draw')),
  status text not null default 'scheduled' check (status in ('scheduled', 'locked', 'scored')),
  created_at timestamptz not null default now(),
  check (home_user_id <> away_user_id)
);

create table if not exists public.user_picks (
  id uuid primary key default gen_random_uuid(),
  fantasy_match_id uuid not null references public.fantasy_matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  real_fixture_id uuid not null references public.real_fixtures(id) on delete cascade,
  selected_team_id text,
  selected_team_name text not null,
  selected_side text not null check (selected_side in ('home', 'away')),
  goals_for integer,
  goals_against integer,
  goal_difference integer,
  created_at timestamptz not null default now(),
  unique (fantasy_match_id, user_id, real_fixture_id)
);

alter table public.profiles enable row level security;
alter table public.fantasy_leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.fantasy_gameweeks enable row level security;
alter table public.real_fixtures enable row level security;
alter table public.gameweek_fixtures enable row level security;
alter table public.fantasy_matches enable row level security;
alter table public.user_picks enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Authenticated users can view leagues"
  on public.fantasy_leagues for select
  to authenticated
  using (true);

create policy "Authenticated users can view league members"
  on public.league_members for select
  to authenticated
  using (true);

create policy "Authenticated users can view gameweeks"
  on public.fantasy_gameweeks for select
  to authenticated
  using (true);

create policy "Authenticated users can view real fixtures"
  on public.real_fixtures for select
  to authenticated
  using (true);

create policy "Authenticated users can view gameweek fixtures"
  on public.gameweek_fixtures for select
  to authenticated
  using (true);

create policy "Authenticated users can view fantasy matches"
  on public.fantasy_matches for select
  to authenticated
  using (true);

create policy "Users can view their own picks"
  on public.user_picks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own picks"
  on public.user_picks for insert
  to authenticated
  with check (auth.uid() = user_id);
