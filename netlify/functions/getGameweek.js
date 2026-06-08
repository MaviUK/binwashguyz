import { createClient } from '@supabase/supabase-js'

export async function handler(event) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: 'Missing Supabase server environment variables.' })
    }

    const gameweekNumber = Number(event.queryStringParameters?.gameweek || 1)

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: gameweek, error: gameweekError } = await supabase
      .from('fantasy_gameweeks')
      .select('id, gameweek_number, deadline_at, status, league_id')
      .eq('gameweek_number', gameweekNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (gameweekError) throw gameweekError

    if (!gameweek) {
      return jsonResponse(404, { error: `Gameweek ${gameweekNumber} has not been created yet.` })
    }

    const { data: fixtures, error: fixturesError } = await supabase
      .from('gameweek_fixtures')
      .select(`
        display_order,
        real_fixtures (
          id,
          provider_fixture_id,
          competition_code,
          competition_name,
          kickoff_at,
          home_team_id,
          home_team_name,
          away_team_id,
          away_team_name,
          status,
          home_score,
          away_score
        )
      `)
      .eq('fantasy_gameweek_id', gameweek.id)
      .order('display_order', { ascending: true })

    if (fixturesError) throw fixturesError

    return jsonResponse(200, {
      gameweek,
      fixtures: (fixtures || []).map((item) => ({
        displayOrder: item.display_order,
        ...item.real_fixtures,
      })),
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
