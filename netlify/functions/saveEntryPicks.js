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
    const { userId, gameweekId, assignedSide, picks } = payload

    if (!userId || !gameweekId) {
      return jsonResponse(400, { error: 'Missing userId or gameweekId.' })
    }

    if (!['home', 'away'].includes(assignedSide)) {
      return jsonResponse(400, { error: 'Assigned side must be home or away.' })
    }

    if (!Array.isArray(picks) || picks.length !== 3) {
      return jsonResponse(400, { error: 'Exactly 3 picks are required.' })
    }

    const uniqueFixtureIds = new Set(picks.map((pick) => String(pick.realFixtureId)))
    if (uniqueFixtureIds.size !== 3) {
      return jsonResponse(400, { error: 'Your 3 picks must come from 3 different fixtures.' })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: WebSocket,
      },
    })

    const { data: entry, error: entryError } = await supabase
      .from('fantasy_entries')
      .upsert(
        {
          fantasy_gameweek_id: gameweekId,
          user_id: userId,
          assigned_side: assignedSide,
          status: 'submitted',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'fantasy_gameweek_id,user_id',
        }
      )
      .select()
      .single()

    if (entryError) throw entryError

    const { error: deleteError } = await supabase
      .from('fantasy_entry_picks')
      .delete()
      .eq('entry_id', entry.id)

    if (deleteError) throw deleteError

    const rows = picks.map((pick) => ({
      entry_id: entry.id,
      real_fixture_id: pick.realFixtureId,
      selected_team_id: pick.selectedTeamId || null,
      selected_team_name: pick.selectedTeamName,
      selected_side: assignedSide,
    }))

    const { data: savedPicks, error: picksError } = await supabase
      .from('fantasy_entry_picks')
      .insert(rows)
      .select()

    if (picksError) throw picksError

    return jsonResponse(200, {
      entryId: entry.id,
      pickCount: savedPicks.length,
      picks: savedPicks,
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
