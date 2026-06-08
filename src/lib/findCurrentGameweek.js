export async function findCurrentGameweekNumber(supabase, userId) {
  const { data: gameweeks, error: gameweeksError } = await supabase
    .from('fantasy_gameweeks')
    .select('id, gameweek_number, status')
    .order('gameweek_number', { ascending: true })

  if (gameweeksError) throw gameweeksError
  if (!gameweeks || gameweeks.length === 0) {
    throw new Error('No gameweeks have been imported yet.')
  }

  const { data: matchups, error: matchupsError } = await supabase
    .from('fantasy_matches')
    .select('fantasy_gameweek_id')
    .or(`home_user_id.eq.${userId},away_user_id.eq.${userId}`)

  if (matchupsError) throw matchupsError

  const { data: entries, error: entriesError } = await supabase
    .from('fantasy_entries')
    .select('fantasy_gameweek_id, status')
    .eq('user_id', userId)
    .eq('status', 'submitted')

  if (entriesError) throw entriesError

  const matchupGameweekIds = new Set((matchups || []).map((item) => item.fantasy_gameweek_id))
  const submittedGameweekIds = new Set((entries || []).map((item) => item.fantasy_gameweek_id))

  const nextPlayableGameweek = gameweeks.find(
    (item) => item.status !== 'scored' && matchupGameweekIds.has(item.id) && !submittedGameweekIds.has(item.id)
  )

  if (nextPlayableGameweek) return nextPlayableGameweek.gameweek_number

  throw new Error('No unsubmitted gameweek found for you. Import the season and generate matchups for the next gameweek.')
}
