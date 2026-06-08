import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const DEFAULT_LEAGUE_NAME = 'Main League'
const DEFAULT_SEASON_NAME = '2026/27'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, {
        error: 'Missing Supabase server environment variables.',
      })
    }

    const payload = JSON.parse(event.body || '{}')
    const gameweekNumber = Number(payload.gameweekNumber)
    const fixtures = Array.isArray(payload.fixtures) ? payload.fixtures : []

    if (!Number.isInteger(gameweekNumber) || gameweekNumber < 1 || gameweekNumber > 38) {
      return jsonResponse(400, { error: 'Gameweek number must be between 1 and 38.' })
    }

    if (fixtures.length !== 10) {
      return jsonResponse(400, { error: 'Exactly 10 fixtures are required.' })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      realtime: {
        transport: ws,
      },
    })

    const { data: league, error: leagueError } = await supabase
      .from('fantasy_leagues')
      .upsert(
        {
          name: DEFAULT_LEAGUE_NAME,
          season_name: DEFAULT_SEASON_NAME,
        },
        {
          onConflict: 'name,season_name',
        }
      )
      .select()
      .single()

    if (leagueError) throw leagueError

    const deadlineAt = getEarliestKickoff(fixtures)

    const { data: gameweek, error: gameweekError } = await supabase
      .from('fantasy_gameweeks')
      .upsert(
        {
          league_id: league.id,
          gameweek_number: gameweekNumber,
          deadline_at: deadlineAt,
          status: 'open',
        },
        {
          onConflict: 'league_id,gameweek_number',
        }
      )
      .select()
      .single()

    if (gameweekError) throw gameweekError

    const realFixtures = fixtures.map((fixture) => ({
      provider: 'football-data.org',
      provider_fixture_id: String(fixture.id),
      competition_code: payload.competition || fixture.competition?.code || 'UNKNOWN',
      competition_name: payload.competitionName || fixture.competition?.name || null,
      season: fixture.season?.startDate || DEFAULT_SEASON_NAME,
      kickoff_at: fixture.utcDate || null,
      home_team_id: fixture.homeTeam?.id ? String(fixture.homeTeam.id) : null,
      home_team_name: fixture.homeTeam?.name || 'Home team TBC',
      away_team_id: fixture.awayTeam?.id ? String(fixture.awayTeam.id) : null,
      away_team_name: fixture.awayTeam?.name || 'Away team TBC',
      status: fixture.status || 'SCHEDULED',
      home_score: fixture.score?.fullTime?.home ?? null,
      away_score: fixture.score?.fullTime?.away ?? null,
      raw_data: fixture,
      last_synced_at: new Date().toISOString(),
    }))

    const { data: savedRealFixtures, error: fixturesError } = await supabase
      .from('real_fixtures')
      .upsert(realFixtures, {
        onConflict: 'provider,provider_fixture_id',
      })
      .select()

    if (fixturesError) throw fixturesError

    const gameweekFixtures = savedRealFixtures.map((fixture, index) => ({
      fantasy_gameweek_id: gameweek.id,
      real_fixture_id: fixture.id,
      display_order: index + 1,
    }))

    const { error: gameweekFixturesError } = await supabase
      .from('gameweek_fixtures')
      .upsert(gameweekFixtures, {
        onConflict: 'fantasy_gameweek_id,real_fixture_id',
      })

    if (gameweekFixturesError) throw gameweekFixturesError

    return jsonResponse(200, {
      leagueId: league.id,
      gameweekId: gameweek.id,
      gameweekNumber,
      fixtureCount: savedRealFixtures.length,
    })
  } catch (error) {
    return jsonResponse(500, { error: error.message })
  }
}

function getEarliestKickoff(fixtures) {
  const dates = fixtures
    .map((fixture) => fixture.utcDate)
    .filter(Boolean)
    .sort()

  return dates[0] || null
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
