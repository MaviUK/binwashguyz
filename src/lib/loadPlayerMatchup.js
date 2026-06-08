export async function loadPlayerMatchupFromSupabase(supabase, userId, gameweekNumber) {
  const { data: gameweek, error: gameweekError } = await supabase
    .from('fantasy_gameweeks')
    .select('id, gameweek_number, deadline_at, status, league_id')
    .eq('gameweek_number', Number(gameweekNumber))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (gameweekError) throw gameweekError
  if (!gameweek) throw new Error(`Gameweek ${gameweekNumber} not found.`)

  const { data: matchup, error: matchupError } = await supabase
    .from('fantasy_matches')
    .select('id, home_user_id, away_user_id, home_score, away_score, result, status')
    .eq('fantasy_gameweek_id', gameweek.id)
    .or(`home_user_id.eq.${userId},away_user_id.eq.${userId}`)
    .maybeSingle()

  if (matchupError) throw matchupError
  if (!matchup) throw new Error('No matchup found for this user yet. Generate matchups first.')

  const assignedSide = matchup.home_user_id === userId ? 'home' : 'away'
  const opponentUserId = assignedSide === 'home' ? matchup.away_user_id : matchup.home_user_id

  const { data: opponent } = await supabase
    .from('profiles')
    .select('id, team_name, username')
    .eq('id', opponentUserId)
    .maybeSingle()

  const { data: fixtureLinks, error: fixturesError } = await supabase
    .from('gameweek_fixtures')
    .select('display_order, real_fixtures(id, provider_fixture_id, competition_code, competition_name, kickoff_at, home_team_id, home_team_name, away_team_id, away_team_name, status, home_score, away_score)')
    .eq('fantasy_gameweek_id', gameweek.id)
    .order('display_order', { ascending: true })

  if (fixturesError) throw fixturesError

  return {
    gameweek,
    matchup,
    assignedSide,
    opponent: opponent || null,
    fixtures: (fixtureLinks || []).map((item) => ({
      displayOrder: item.display_order,
      ...item.real_fixtures,
    })),
  }
}
