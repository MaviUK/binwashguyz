-- Adds helpful match constraints and policies for generated head-to-head fixtures.
-- Run this after supabase/schema.sql and supabase/002_entry_picks.sql.

alter table public.fantasy_matches
add constraint if not exists fantasy_matches_gameweek_users_key
unique (fantasy_gameweek_id, home_user_id, away_user_id);

create policy if not exists "Users can view matches they are involved in"
  on public.fantasy_matches for select
  to authenticated
  using (auth.uid() = home_user_id or auth.uid() = away_user_id);
