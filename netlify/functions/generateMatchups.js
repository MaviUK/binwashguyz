import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const PAGE_SIZE = 1000
const UPSERT_SIZE = 500

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

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: ws,
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

    if (!gameweek) {
      return jsonResponse(404, { error: `Gameweek ${gameweekNumber} has not been created yet.` })
    }

    const members = await fetchAllMembers(supabase, gameweek.league_id)

    if (!members || members.length < 2) {
      return jsonResponse(400, { error: 'At least 2 league members are needed to generate matchups.' })
    }

    const orderedMembers = [...members].sort((a, b) => String(a.user_id).localeCompare(String(b.user_id)))
    const matchups = []

    for (let index = 0; index < orderedMembers.length - 1; index += 2) {
      const first = orderedMembers[index]
      const second = orderedMembers[index + 1]
      const swapSides = gameweekNumber % 2 === 0

      matchups.push({
        fantasy_gameweek_id: gameweek.id,
        home_user_id: swapSides ? second.user_id : first.user_id,
        away_user_id: swapSides ? first.user_id : second.user_id,
        status: 'scheduled',
      })
    }

    const savedCount = await upsertMatchups(supabase, matchups)
    const hasBye = orderedMembers.length % 2 === 1

    return jsonResponse(200, {
      gameweekNumber,
      memberCount: orderedMembers.length,
      matchupCount: savedCount,
      hasBye,
      byeUserId: hasBye ? orderedMembers[orderedMembers.length - 1].user_id : null,
    })
  } catch (error) {
    return jsonResponse(500, { error: error.message })
  }
}

async function fetchAllMembers(supabase, leagueId) {
  const members = []
  let from = 0

  while (true) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('league_members')
      .select('user_id, joined_at')
      .eq('league_id', leagueId)
      .order('joined_at', { ascending: true })
      .range(from, to)

    if (error) throw error
    members.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return members
}

async function upsertMatchups(supabase, matchups) {
  let savedCount = 0

  for (let index = 0; index < matchups.length; index += UPSERT_SIZE) {
    const chunk = matchups.slice(index, index + UPSERT_SIZE)
    const { error } = await supabase
      .from('fantasy_matches')
      .upsert(chunk, {
        onConflict: 'fantasy_gameweek_id,home_user_id,away_user_id',
      })

    if (error) throw error
    savedCount += chunk.length
  }

  return savedCount
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
