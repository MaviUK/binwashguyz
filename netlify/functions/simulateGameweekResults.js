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
    if (!gameweek) return jsonResponse(404, { error: `Gameweek ${gameweekNumber} not found.` })

    const { data: gameweekFixtures, error: fixturesError } = await supabase
      .from('gameweek_fixtures')
      .select('display_order, real_fixtures(id, home_team_name, away_team_name)')
      .eq('fantasy_gameweek_id', gameweek.id)
      .order('display_order', { ascending: true })

    if (fixturesError) throw fixturesError

    const fixtures = (gameweekFixtures || [])
      .map((item) => item.real_fixtures)
      .filter(Boolean)

    if (fixtures.length === 0) {
      return jsonResponse(400, { error: 'This gameweek has no fixtures to simulate.' })
    }

    const simulated = []

    for (const fixture of fixtures) {
      const homeScore = randomScore()
      const awayScore = randomScore()

      const { error: updateError } = await supabase
        .from('real_fixtures')
        .update({
          status: 'FINISHED',
          home_score: homeScore,
          away_score: awayScore,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', fixture.id)

      if (updateError) throw updateError

      simulated.push({
        fixtureId: fixture.id,
        homeTeam: fixture.home_team_name,
        awayTeam: fixture.away_team_name,
        homeScore,
        awayScore,
      })
    }

    return jsonResponse(200, {
      gameweekNumber,
      fixtureCount: simulated.length,
      simulated,
    })
  } catch (error) {
    return jsonResponse(500, { error: error.message })
  }
}

function randomScore() {
  const roll = Math.random()
  if (roll < 0.08) return 4
  if (roll < 0.22) return 3
  if (roll < 0.48) return 2
  if (roll < 0.76) return 1
  return 0
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
