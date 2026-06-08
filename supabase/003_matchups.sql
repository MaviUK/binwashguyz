-- Adds constraints and policies needed for automatic head-to-head matchups.
-- Run this after supabase/schema.sql and supabase/002_entry_picks.sql.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fantasy_matches_gameweek_home_away_key'
  ) then
    alter table public.fantasy_matches
    add constraint fantasy_matches_gameweek_home_away_key
    unique (fantasy_gameweek_id, home_user_id, away_user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fantasy_leagues_name_season_name_key'
  ) then
    alter table public.fantasy_leagues
    add constraint fantasy_leagues_name_season_name_key
    unique (name, season_name);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
    and tablename = 'fantasy_matches'
    and policyname = 'Users can view matches they are involved in'
  ) then
    create policy "Users can view matches they are involved in"
      on public.fantasy_matches for select
      to authenticated
      using (auth.uid() = home_user_id or auth.uid() = away_user_id);
  end if;
end $$;
