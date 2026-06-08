-- Adds player gameweek entries and picks.
-- Run this after supabase/schema.sql.

create table if not exists public.fantasy_entries (
  id uuid primary key default gen_random_uuid(),
  fantasy_gameweek_id uuid not null references public.fantasy_gameweeks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_side text not null check (assigned_side in ('home', 'away')),
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'locked', 'scored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fantasy_gameweek_id, user_id)
);

create table if not exists public.fantasy_entry_picks (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.fantasy_entries(id) on delete cascade,
  real_fixture_id uuid not null references public.real_fixtures(id) on delete cascade,
  selected_team_id text,
  selected_team_name text not null,
  selected_side text not null check (selected_side in ('home', 'away')),
  goals_for integer,
  goals_against integer,
  goal_difference integer,
  created_at timestamptz not null default now(),
  unique (entry_id, real_fixture_id)
);

alter table public.fantasy_entries enable row level security;
alter table public.fantasy_entry_picks enable row level security;

create policy "Users can view their own fantasy entries"
  on public.fantasy_entries for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own fantasy entries"
  on public.fantasy_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own fantasy entries"
  on public.fantasy_entries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can view their own fantasy entry picks"
  on public.fantasy_entry_picks for select
  to authenticated
  using (
    exists (
      select 1
      from public.fantasy_entries fe
      where fe.id = fantasy_entry_picks.entry_id
      and fe.user_id = auth.uid()
    )
  );

create policy "Users can create their own fantasy entry picks"
  on public.fantasy_entry_picks for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.fantasy_entries fe
      where fe.id = fantasy_entry_picks.entry_id
      and fe.user_id = auth.uid()
    )
  );

create policy "Users can update their own fantasy entry picks"
  on public.fantasy_entry_picks for update
  to authenticated
  using (
    exists (
      select 1
      from public.fantasy_entries fe
      where fe.id = fantasy_entry_picks.entry_id
      and fe.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.fantasy_entries fe
      where fe.id = fantasy_entry_picks.entry_id
      and fe.user_id = auth.uid()
    )
  );
