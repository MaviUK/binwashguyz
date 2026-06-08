export async function handler(event) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: 'Missing Supabase server environment variables.' })
    }

    const userId = event.queryStringParameters?.userId
    const gameweekNumber = Number(event.queryStringParameters?.gameweek || 1)

    if (!userId) {
      return jsonResponse(400, { error: 'Missing userId.' })
    }

    const gameweeks = await supabaseGet(supabaseUrl, serviceRoleKey, 'fantasy_gameweeks', {
      select: 'id,gameweek_number,deadline_at,status',
      gameweek_number: `eq.${gameweekNumber}`,
      order: 'created_at.desc',
      limit: '1',
    })

    const gameweek = gameweeks[0]
    if (!gameweek) return jsonResponse(404, { error: `Gameweek ${gameweekNumber} not found.` })

    const matchups = await supabaseGet(supabaseUrl, serviceRoleKey, 'fantasy_matches', {
      select: 'id,home_user_id,away_user_id,home_score,away_score,result,status',
      fantasy_gameweek_id: `eq.${gameweek.id}`,
      or: `(home_user_id.eq.${userId},away_user_id.eq.${userId})`,
      limit: '1',
    })

    const matchup = matchups[0]
    if (!matchup) {
      return jsonResponse(404, { error: 'No matchup found for this user yet. Generate matchups first.' })
    }

    const assignedSide = matchup.home_user_id === userId ? 'home' : 'away'
    const opponentUserId = assignedSide === 'home' ? matchup.away_user_id : matchup.home_user_id

    const profiles = await supabaseGet(supabaseUrl, serviceRoleKey, 'profiles', {
      select: 'id,team_name,username',
      id: `eq.${opponentUserId}`,
      limit: '1',
    })

    const fixtureLinks = await supabaseGet(supabaseUrl, serviceRoleKey, 'gameweek_fixtures', {
      select: 'display_order,real_fixtures(id,provider_fixture_id,competition_code,competition_name,kickoff_at,home_team_id,home_team_name,away_team_id,away_team_name,status,home_score,away_score)',
      fantasy_gameweek_id: `eq.${gameweek.id}`,
      order: 'display_order.asc',
    })

    return jsonResponse(200, {
      gameweek,
      matchup,
      assignedSide,
      opponent: profiles[0] || null,
      fixtures: fixtureLinks.map((item) => ({
        displayOrder: item.display_order,
        ...item.real_fixtures,
      })),
    })
  } catch (error) {
    return jsonResponse(500, { error: error.message })
  }
}

async function supabaseGet(supabaseUrl, serviceRoleKey, table, params) {
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || `Supabase REST request failed for ${table}`)
  }

  return Array.isArray(data) ? data : []
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
