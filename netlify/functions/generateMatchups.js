import { createClient } from '@supabase/supabase-js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: 'Missing Supabase server environment variables.' })
    }

    const payload = JSON.parse(event.body || '{}')
    const gameweekNumber = Number(payload.gameweekNumber || 1)

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: gameweek, error: gameweekError } = await supabase
      .from('fantasy_gameweeks')
      .select('id, gameweek_number')
      .eq('gameweek_number', gameweekNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (gameweekError) throw gameweekError

    if (!gameweek) {
      return jsonResponse(404, { error: `Gameweek ${gameweekNumber} has not been created yet.` })
    }

    const { data: entries, error: entriesError } = await supabase
      .from('fantasy_entries')
      .select('id, user_id, assigned_side, created_at')
      .eq('fantasy_gameweek_id', gameweek.id)
      .order('created_at', { ascending: true })

    if (entriesError) throw entriesError

    if (!entries || entries.length < 2) {
      return jsonResponse(400, { error: 'At least 2 submitted players are needed to generate matchups.' })
    }

    const homeEntries = entries.filter((entry) => entry.assigned_side === 'home')
    const awayEntries = entries.filter((entry) => entry.assigned_side === 'away')

    const matchups = []
    const usedUserIds = new Set()

    while (homeEntries.length > 0 && awayEntries.length > 0) {
      const home = homeEntries.shift()
      const awayIndex = awayEntries.findIndex((entry) => entry.user_id !== home.user_id)

      if (awayIndex === -1) break

      const [away] = awayEntries.splice(awayIndex, 1)

      if (usedUserIds.has(home.user_id) || usedUserIds.has(away.user_id)) continue

      usedUserIds.add(home.user_id)
      usedUserIds.add(away.user_id)

      matchups.push({
        fantasy_gameweek_id: gameweek.id,
        home_user_id: home.user_id,
        away_user_id: away.user_id,
        status: 'scheduled',
      })
    }

    if (matchups.length === 0) {
      return jsonResponse(400, {
        error: 'No valid matchups could be created. You need at least one home entry and one away entry.',
      })
    }

    const { data: savedMatchups, error: matchupsError } = await supabase
      .from('fantasy_matches')
      .upsert(matchups, {
        onConflict: 'fantasy_gameweek_id,home_user_id,away_user_id',
      })
      .select()

    if (matchupsError) throw matchupsError

    return jsonResponse(200, {
      gameweekNumber,
      matchupCount: savedMatchups.length,
      unpairedPlayers: entries.length - savedMatchups.length * 2,
      matchups: savedMatchups,
    })
  } catch (error) {
    return jsonResponse(500, { error: error.message })
  }
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
