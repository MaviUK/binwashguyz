import { createClient } from '@supabase/supabase-js'

export async function handler(event) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: 'Missing Supabase server environment variables.' })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: league, error: leagueError } = await supabase
      .from('fantasy_leagues')
      .select('id, name, season_name')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (leagueError) throw leagueError
    if (!league) return jsonResponse(404, { error: 'No fantasy league found yet.' })

    const { data: members, error: membersError } = await supabase
      .from('league_members')
      .select('user_id, profiles:user_id(id, team_name, username)')
      .eq('league_id', league.id)

    if (membersError) throw membersError

    const table = new Map()

    for (const member of members || []) {
      table.set(member.user_id, {
        userId: member.user_id,
        teamName: member.profiles?.team_name || 'Unknown Team',
        username: member.profiles?.username || '',
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        scoreFor: 0,
        scoreAgainst: 0,
        scoreDifference: 0,
        points: 0,
      })
    }

    const { data: gameweeks, error: gameweeksError } = await supabase
      .from('fantasy_gameweeks')
      .select('id')
      .eq('league_id', league.id)

    if (gameweeksError) throw gameweeksError

    const gameweekIds = (gameweeks || []).map((gameweek) => gameweek.id)

    if (gameweekIds.length > 0) {
      const { data: matches, error: matchesError } = await supabase
        .from('fantasy_matches')
        .select('*')
        .in('fantasy_gameweek_id', gameweekIds)
        .eq('status', 'scored')

      if (matchesError) throw matchesError

      for (const match of matches || []) {
        const home = table.get(match.home_user_id)
        const away = table.get(match.away_user_id)
        if (!home || !away) continue

        applyMatch(home, match.home_score || 0, match.away_score || 0)
        applyMatch(away, match.away_score || 0, match.home_score || 0)
      }
    }

    const rows = [...table.values()]
      .map((row) => ({
        ...row,
        scoreDifference: row.scoreFor - row.scoreAgainst,
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.scoreDifference !== a.scoreDifference) return b.scoreDifference - a.scoreDifference
        if (b.scoreFor !== a.scoreFor) return b.scoreFor - a.scoreFor
        return a.teamName.localeCompare(b.teamName)
      })
      .map((row, index) => ({ ...row, position: index + 1 }))

    return jsonResponse(200, {
      league,
      table: rows,
    })
  } catch (error) {
    return jsonResponse(500, { error: error.message })
  }
}

function applyMatch(row, scoreFor, scoreAgainst) {
  row.played += 1
  row.scoreFor += scoreFor
  row.scoreAgainst += scoreAgainst

  if (scoreFor > scoreAgainst) {
    row.won += 1
    row.points += 3
  } else if (scoreFor < scoreAgainst) {
    row.lost += 1
  } else {
    row.drawn += 1
    row.points += 1
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
