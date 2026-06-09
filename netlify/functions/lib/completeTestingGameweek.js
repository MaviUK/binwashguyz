const PAGE_SIZE = 1000
const IN_CHUNK_SIZE = 250
const WRITE_CHUNK_SIZE = 800

export async function completeTestingGameweek(supabase, gameweekId) {
  const { data: gameweek, error: gameweekError } = await supabase
    .from('fantasy_gameweeks')
    .select('id, gameweek_number')
    .eq('id', gameweekId)
    .single()

  if (gameweekError) throw gameweekError

  const matchups = await fetchAllPages((from, to) =>
    supabase
      .from('fantasy_matches')
      .select('id, fantasy_gameweek_id, home_user_id, away_user_id, created_at')
      .eq('fantasy_gameweek_id', gameweekId)
      .range(from, to)
  )

  if (matchups.length === 0) {
    return {
      gameweekNumber: gameweek.gameweek_number,
      skipped: true,
      reason: 'No matchups found for this gameweek.',
    }
  }

  const fixtureLinks = await fetchAllPages((from, to) =>
    supabase
      .from('gameweek_fixtures')
      .select('display_order, real_fixtures(*)')
      .eq('fantasy_gameweek_id', gameweekId)
      .order('display_order', { ascending: true })
      .range(from, to)
  )

  const fixtures = fixtureLinks.map((item) => item.real_fixtures).filter(Boolean)
  if (fixtures.length < 3) throw new Error('At least 3 fixtures are needed to auto-pick.')

  const players = []
  for (const matchup of matchups) {
    players.push({ userId: matchup.home_user_id, assignedSide: 'home' })
    players.push({ userId: matchup.away_user_id, assignedSide: 'away' })
  }

  const entryRows = players.map((player) => ({
    fantasy_gameweek_id: gameweekId,
    user_id: player.userId,
    assigned_side: player.assignedSide,
    status: 'submitted',
    updated_at: new Date().toISOString(),
  }))

  await upsertRows(supabase, 'fantasy_entries', entryRows, 'fantasy_gameweek_id,user_id')

  const entries = await fetchAllPages((from, to) =>
    supabase
      .from('fantasy_entries')
      .select('id, user_id, assigned_side')
      .eq('fantasy_gameweek_id', gameweekId)
      .range(from, to)
  )

  const entryIds = entries.map((entry) => entry.id)
  const existingPicks = await fetchByIdChunks(entryIds, (chunk) =>
    supabase
      .from('fantasy_entry_picks')
      .select('id, entry_id')
      .in('entry_id', chunk)
  )

  const pickCountByEntry = new Map()
  for (const pick of existingPicks) {
    pickCountByEntry.set(pick.entry_id, (pickCountByEntry.get(pick.entry_id) || 0) + 1)
  }

  const entriesNeedingPicks = entries.filter((entry) => (pickCountByEntry.get(entry.id) || 0) < 3)

  for (const chunk of chunkArray(entriesNeedingPicks.map((entry) => entry.id), IN_CHUNK_SIZE)) {
    if (chunk.length === 0) continue
    const { error } = await supabase
      .from('fantasy_entry_picks')
      .delete()
      .in('entry_id', chunk)
    if (error) throw error
  }

  const autoPickRows = []
  for (const entry of entriesNeedingPicks) {
    const selectedFixtures = chooseRandomFixtures(fixtures, 3)
    for (const fixture of selectedFixtures) {
      const isHome = entry.assigned_side === 'home'
      autoPickRows.push({
        entry_id: entry.id,
        real_fixture_id: fixture.id,
        selected_team_id: isHome ? fixture.home_team_id : fixture.away_team_id,
        selected_team_name: isHome ? fixture.home_team_name : fixture.away_team_name,
        selected_side: entry.assigned_side,
      })
    }
  }

  if (autoPickRows.length > 0) {
    await insertRows(supabase, 'fantasy_entry_picks', autoPickRows)
  }

  const allPicks = await fetchByIdChunks(entryIds, (chunk) =>
    supabase
      .from('fantasy_entry_picks')
      .select('*')
      .in('entry_id', chunk)
  )

  const fixtureMap = new Map(fixtures.map((fixture) => [fixture.id, fixture]))
  const entryScoreMap = new Map()
  const scoredPickRows = []

  for (const pick of allPicks) {
    const fixture = fixtureMap.get(pick.real_fixture_id)
    if (!fixture) continue
    const hasScore = fixture.home_score !== null && fixture.home_score !== undefined && fixture.away_score !== null && fixture.away_score !== undefined
    if (!hasScore) continue

    const isHomePick = pick.selected_side === 'home'
    const goalsFor = isHomePick ? fixture.home_score : fixture.away_score
    const goalsAgainst = isHomePick ? fixture.away_score : fixture.home_score
    const goalDifference = goalsFor - goalsAgainst

    scoredPickRows.push({
      ...pick,
      goals_for: goalsFor,
      goals_against: goalsAgainst,
      goal_difference: goalDifference,
    })

    if (!entryScoreMap.has(pick.entry_id)) entryScoreMap.set(pick.entry_id, { total: 0, count: 0 })
    const score = entryScoreMap.get(pick.entry_id)
    if (score.count < 3) {
      score.total += goalDifference
      score.count += 1
    }
  }

  if (scoredPickRows.length > 0) {
    await upsertRows(supabase, 'fantasy_entry_picks', scoredPickRows, 'id')
  }

  const entryByUser = new Map(entries.map((entry) => [entry.user_id, entry]))
  const scoredMatchRows = []

  for (const matchup of matchups) {
    const homeEntry = entryByUser.get(matchup.home_user_id)
    const awayEntry = entryByUser.get(matchup.away_user_id)
    if (!homeEntry || !awayEntry) continue

    const home = entryScoreMap.get(homeEntry.id)
    const away = entryScoreMap.get(awayEntry.id)
    if (!home || !away || home.count < 3 || away.count < 3) continue

    const result = home.total > away.total ? 'home_win' : away.total > home.total ? 'away_win' : 'draw'
    scoredMatchRows.push({
      ...matchup,
      home_score: home.total,
      away_score: away.total,
      result,
      status: 'scored',
    })
  }

  if (scoredMatchRows.length > 0) {
    await upsertRows(supabase, 'fantasy_matches', scoredMatchRows, 'id')
  }

  const { error: updateGameweekError } = await supabase
    .from('fantasy_gameweeks')
    .update({ status: 'scored' })
    .eq('id', gameweekId)

  if (updateGameweekError) throw updateGameweekError

  return {
    gameweekNumber: gameweek.gameweek_number,
    playersChecked: players.length,
    entriesCreatedOrUpdated: entryRows.length,
    autoPickedEntries: entriesNeedingPicks.length,
    autoPicksCreated: autoPickRows.length,
    picksScored: scoredPickRows.length,
    matchesScored: scoredMatchRows.length,
  }
}

async function fetchAllPages(queryFactory) {
  const rows = []
  let from = 0

  while (true) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await queryFactory(from, to)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

async function fetchByIdChunks(ids, queryFactory) {
  const rows = []
  for (const chunk of chunkArray(ids, IN_CHUNK_SIZE)) {
    const { data, error } = await queryFactory(chunk)
    if (error) throw error
    rows.push(...(data || []))
  }
  return rows
}

async function insertRows(supabase, table, rows) {
  for (const chunk of chunkArray(rows, WRITE_CHUNK_SIZE)) {
    if (chunk.length === 0) continue
    const { error } = await supabase.from(table).insert(chunk)
    if (error) throw error
  }
}

async function upsertRows(supabase, table, rows, onConflict) {
  for (const chunk of chunkArray(rows, WRITE_CHUNK_SIZE)) {
    if (chunk.length === 0) continue
    const { error } = await supabase.from(table).upsert(chunk, { onConflict })
    if (error) throw error
  }
}

function chooseRandomFixtures(fixtures, count) {
  return [...fixtures]
    .map((fixture) => ({ fixture, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, count)
    .map((item) => item.fixture)
}

function chunkArray(items, size) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}
