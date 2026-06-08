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

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: 'Missing Supabase server environment variables.' })
    }

    const payload = JSON.parse(event.body || '{}')
    const gameweekNumber = Number(payload.gameweekNumber || 1)
    const force = Boolean(payload.force)

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
      .select('id, gameweek_number, deadline_at, status')
      .eq('gameweek_number', gameweekNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (gameweekError) throw gameweekError
    if (!gameweek) return jsonResponse(404, { error: `Gameweek ${gameweekNumber} not found.` })

    const deadlinePassed = gameweek.deadline_at ? new Date(gameweek.deadline_at) <= new Date() : false

    if (!deadlinePassed && !force) {
      return jsonResponse(400, {
        error: 'Deadline has not passed yet. Use force=true for testing only.',
      })
    }

    const { data: matchups, error: matchupsError } = await supabase
      .from('fantasy_matches')
      .select('id, home_user_id, away_user_id')
      .eq('fantasy_gameweek_id', gameweek.id)

    if (matchupsError) throw matchupsError
    if (!matchups || matchups.length === 0) {
      return jsonResponse(400, { error: 'No matchups found. Generate matchups first.' })
    }

    const { data: gameweekFixtures, error: fixturesError } = await supabase
      .from('gameweek_fixtures')
      .select('display_order, real_fixtures(*)')
      .eq('fantasy_gameweek_id', gameweek.id)
      .order('display_order', { ascending: true })

    if (fixturesError) throw fixturesError

    const fixtures = (gameweekFixtures || []).map((item) => item.real_fixtures).filter(Boolean)

    if (fixtures.length < 3) {
      return jsonResponse(400, { error: 'At least 3 fixtures are needed to auto-pick.' })
    }

    const players = []
    for (const matchup of matchups) {
      players.push({ userId: matchup.home_user_id, assignedSide: 'home' })
      players.push({ userId: matchup.away_user_id, assignedSide: 'away' })
    }

    let createdEntries = 0
    let replacedPicks = 0
    const results = []

    for (const player of players) {
      const { data: entry, error: entryError } = await supabase
        .from('fantasy_entries')
        .upsert(
          {
            fantasy_gameweek_id: gameweek.id,
            user_id: player.userId,
            assigned_side: player.assignedSide,
            status: 'submitted',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'fantasy_gameweek_id,user_id' }
        )
        .select()
        .single()

      if (entryError) throw entryError
      createdEntries += 1

      const { data: existingPicks, error: existingPicksError } = await supabase
        .from('fantasy_entry_picks')
        .select('id')
        .eq('entry_id', entry.id)

      if (existingPicksError) throw existingPicksError

      if (existingPicks && existingPicks.length >= 3) {
        results.push({ userId: player.userId, assignedSide: player.assignedSide, action: 'kept_existing' })
        continue
      }

      const picks = chooseRandomFixtures(fixtures, 3).map((fixture) => {
        const isHome = player.assignedSide === 'home'
        return {
          entry_id: entry.id,
          real_fixture_id: fixture.id,
          selected_team_id: isHome ? fixture.home_team_id : fixture.away_team_id,
          selected_team_name: isHome ? fixture.home_team_name : fixture.away_team_name,
          selected_side: player.assignedSide,
        }
      })

      const { error: deleteError } = await supabase
        .from('fantasy_entry_picks')
        .delete()
        .eq('entry_id', entry.id)

      if (deleteError) throw deleteError

      const { data: savedPicks, error: insertError } = await supabase
        .from('fantasy_entry_picks')
        .insert(picks)
        .select()

      if (insertError) throw insertError

      replacedPicks += savedPicks.length
      results.push({
        userId: player.userId,
        assignedSide: player.assignedSide,
        action: 'auto_picked',
        teams: savedPicks.map((pick) => pick.selected_team_name),
      })
    }

    return jsonResponse(200, {
      gameweekNumber,
      deadlinePassed,
      force,
      entriesChecked: players.length,
      entriesUpserted: createdEntries,
      picksCreated: replacedPicks,
      results,
    })
  } catch (error) {
    return jsonResponse(500, { error: error.message })
  }
}

function chooseRandomFixtures(fixtures, count) {
  const shuffled = [...fixtures]
    .map((fixture) => ({ fixture, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.fixture)

  return shuffled.slice(0, count)
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
