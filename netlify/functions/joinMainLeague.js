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

    const league = await getOrCreateMainLeague(supabase)
    const membership = await getOrCreateMembership(supabase, league.id, userId)

    return jsonResponse(200, {
      league,
      membership,
    })
  } catch (error) {
    return jsonResponse(500, { error: error.message })
  }
}

async function getOrCreateMainLeague(supabase) {
  const { data: existing, error: findError } = await supabase
    .from('fantasy_leagues')
    .select('*')
    .eq('name', DEFAULT_LEAGUE_NAME)
    .eq('season_name', DEFAULT_SEASON_NAME)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (findError) throw findError
  if (existing) return existing

  const { data: created, error: createError } = await supabase
    .from('fantasy_leagues')
    .insert({
      name: DEFAULT_LEAGUE_NAME,
      season_name: DEFAULT_SEASON_NAME,
    })
    .select()
    .single()

  if (createError) throw createError
  return created
}

async function getOrCreateMembership(supabase, leagueId, userId) {
  const { data: existing, error: findError } = await supabase
    .from('league_members')
    .select('*')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (findError) throw findError
  if (existing) return existing

  const { data: created, error: createError } = await supabase
    .from('league_members')
    .insert({
      league_id: leagueId,
      user_id: userId,
    })
    .select()
    .single()

  if (createError) throw createError
  return created
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
