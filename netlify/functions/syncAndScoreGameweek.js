import WebSocket from 'ws'

globalThis.WebSocket = globalThis.WebSocket || WebSocket

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const footballApiKey = process.env.FOOTBALL_DATA_API_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: 'Missing Supabase server environment variables.' })
    }

    const payload = JSON.parse(event.body || '{}')
    const gameweekNumber = Number(payload.gameweekNumber || 1)
    const syncResults = payload.syncResults !== false

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: WebSocket,
      },
    })

    const { data: gameweek, error: gameweekError } = await supabase
      .from('fantasy_gameweeks')
      .select('id, league_id, gameweek_number')
      .eq('gameweek_number', gameweekNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (gameweekError) throw gameweekError
    if (!gameweek) return jsonResponse(404, { error: `Gameweek ${gameweekNumber} not found.` })

    const { data: gameweekFixtures, error: fixturesError } = await supabase
      .from('gameweek_fixtures')
      .select('display_order, real_fixtures(*)')
      .eq('fantasy_gameweek_id', gameweek.id)
      .order('display_order', { ascending: true })

    if (fixturesError) throw fixturesError

    let fixtures = (gameweekFixtures || []).map((item) => item.real_fixtures).filter(Boolean)

    if (fixtures.length === 0) {
      return jsonResponse(400, { error: 'This gameweek has no fixtures.' })
    }

    if (syncResults) {
      if (!footballApiKey) {
        return jsonResponse(500, { error: 'Missing FOOTBALL_DATA_API_KEY.' })
      }

      await syncFixtureResults(supabase, footballApiKey, fixtures)
      fixtures = await reloadFixtures(supabase, gameweek.id)
    }

    const finishedFixtures = fixtures.filter(
      (fixture) => fixture.home_score !== null && fixture.home_score !== undefined && fixture.away_score !== null && fixture.away_score !== undefined
    )

    if (finishedFixtures.length === 0) {
      return jsonResponse(400, { error: 'No finished fixture scores are available yet.' })
    }

    const fixtureMap = new Map(fixtures.map((fixture) => [fixture.id, fixture]))

    const { data: entries, error: entriesError } = await supabase
      .from('fantasy_entries')
      .select('id, user_id, assigned_side')
      .eq('fantasy_gameweek_id', gameweek.id)

    if (entriesError) throw entriesError

    const entryScoreMap = new Map()
    let picksScored = 0

    for (const entry of entries || []) {
      const { data: picks, error: picksError } = await supabase
        .from('fantasy_entry_picks')
        .select('*')
        .eq('entry_id', entry.id)

      if (picksError) throw picksError

      let entryTotal = 0
      let scoredCount = 0

      for (const pick of picks || []) {
        const fixture = fixtureMap.get(pick.real_fixture_id)
        if (!fixture) continue

        const hasScore = fixture.home_score !== null && fixture.home_score !== undefined && fixture.away_score !== null && fixture.away_score !== undefined
        if (!hasScore) continue

        const isHomePick = pick.selected_side === 'home'
        const goalsFor = isHomePick ? fixture.home_score : fixture.away_score
        const goalsAgainst = isHomePick ? fixture.away_score : fixture.home_score
        const goalDifference = goalsFor - goalsAgainst

        const { error: updatePickError } = await supabase
          .from('fantasy_entry_picks')
          .update({
            goals_for: goalsFor,
            goals_against: goalsAgainst,
            goal_difference: goalDifference,
          })
          .eq('id', pick.id)

        if (updatePickError) throw updatePickError

        entryTotal += goalDifference
        scoredCount += 1
        picksScored += 1
      }

      entryScoreMap.set(entry.user_id, {
        entryId: entry.id,
        total: entryTotal,
        scoredCount,
      })
    }

    const { data: matchups, error: matchupsError } = await supabase
      .from('fantasy_matches')
      .select('*')
      .eq('fantasy_gameweek_id', gameweek.id)

    if (matchupsError) throw matchupsError

    const scoredMatches = []

    for (const matchup of matchups || []) {
      const home = entryScoreMap.get(matchup.home_user_id)
      const away = entryScoreMap.get(matchup.away_user_id)

      if (!home || !away) continue

      const homeScore = home.total
      const awayScore = away.total
      const result = homeScore > awayScore ? 'home_win' : awayScore > homeScore ? 'away_win' : 'draw'

      const { data: savedMatch, error: saveMatchError } = await supabase
        .from('fantasy_matches')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          result,
          status: 'scored',
        })
        .eq('id', matchup.id)
        .select()
        .single()

      if (saveMatchError) throw saveMatchError

      scoredMatches.push(savedMatch)
    }

    const { error: gameweekUpdateError } = await supabase
      .from('fantasy_gameweeks')
      .update({ status: 'scored' })
      .eq('id', gameweek.id)

    if (gameweekUpdateError) throw gameweekUpdateError

    return jsonResponse(200, {
      gameweekNumber,
      fixturesChecked: fixtures.length,
      finishedFixtures: finishedFixtures.length,
      picksScored,
      matchesScored: scoredMatches.length,
      scoredMatches,
    })
  } catch (error) {
    return jsonResponse(500, { error: error.message })
  }
}

async function syncFixtureResults(supabase, apiKey, fixtures) {
  const competitions = [...new Set(fixtures.map((fixture) => fixture.competition_code).filter(Boolean))]
  const fixtureIds = new Set(fixtures.map((fixture) => String(fixture.provider_fixture_id)))

  for (const competitionCode of competitions) {
    const competitionFixtures = fixtures.filter((fixture) => fixture.competition_code === competitionCode && fixture.kickoff_at)
    const dates = competitionFixtures.map((fixture) => fixture.kickoff_at.slice(0, 10)).sort()
    const params = new URLSearchParams()

    if (dates[0]) params.set('dateFrom', dates[0])
    if (dates[dates.length - 1]) params.set('dateTo', dates[dates.length - 1])

    const url = `https://api.football-data.org/v4/competitions/${competitionCode}/matches?${params.toString()}`
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': apiKey,
      },
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || `Could not sync ${competitionCode} results.`)

    const matches = data.matches || []

    for (const match of matches) {
      if (!fixtureIds.has(String(match.id))) continue

      const homeScore = match.score?.fullTime?.home ?? null
      const awayScore = match.score?.fullTime?.away ?? null

      await supabase
        .from('real_fixtures')
        .update({
          status: match.status || 'UNKNOWN',
          home_score: homeScore,
          away_score: awayScore,
          raw_data: match,
          last_synced_at: new Date().toISOString(),
        })
        .eq('provider', 'football-data.org')
        .eq('provider_fixture_id', String(match.id))
    }
  }
}

async function reloadFixtures(supabase, gameweekId) {
  const { data, error } = await supabase
    .from('gameweek_fixtures')
    .select('display_order, real_fixtures(*)')
    .eq('fantasy_gameweek_id', gameweekId)
    .order('display_order', { ascending: true })

  if (error) throw error

  return (data || []).map((item) => item.real_fixtures).filter(Boolean)
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  }
}
