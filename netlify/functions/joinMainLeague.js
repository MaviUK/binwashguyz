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
      return jsonResponse(500, { error: 'Missing Supabase server environment variables.' })
    }

    const payload = JSON.parse(event.body || '{}')
    const { userId } = payload

    if (!userId) {
      return jsonResponse(400, { error: 'Missing userId.' })
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
        { onConflict: 'name,season_name' }
      )
      .select()
      .single()

    if (leagueError) throw leagueError

    const { data: membership, error: memberError } = await supabase
      .from('league_members')
      .upsert(
        {
          league_id: league.id,
          user_id: userId,
        },
        { onConflict: 'league_id,user_id' }
      )
      .select()
      .single()

    if (memberError) throw memberError

    return jsonResponse(200, {
      league,
      membership,
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
