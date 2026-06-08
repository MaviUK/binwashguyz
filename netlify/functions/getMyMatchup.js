import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

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

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      realtime: {
        transport: ws,
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

    const { data: matchup, error: matchupError } = await supabase
      .from('fantasy_matches')
      .select('id, home_user_id, away_user_id, home_score, away_score, result, status')
      .eq('fantasy_gameweek_id', gameweek.id)
      .or(`home_user_id.eq.${userId},away_user_id.eq.${userId}`)
      .maybeSingle()

    if (matchupError) throw matchupError

    if (!matchup) {
      return jsonResponse(404, { error: 'No matchup found for this user yet. Generate matchups first.' })
    }

    const assignedSide = matchup.home_user_id === userId ? 'home' : 'away'
    const opponentUserId = assignedSide === 'home' ? matchup.away_user_id : matchup.home_user_id

    const { data: opponentProfile } = await supabase
      .from('profiles')
      .select('id, team_name, username')
      .eq('id', opponentUserId)
      .maybeSingle()

    return jsonResponse(200, {
      gameweek,
      matchup,
      assignedSide,
      opponent: opponentProfile,
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
