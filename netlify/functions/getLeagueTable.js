import WebSocket from 'ws'

globalThis.WebSocket = globalThis.WebSocket || WebSocket

export async function handler(event) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: 'Missing Supabase server environment variables.' })
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
        matches: [],
      })
    }

    const { data: gameweeks, error: gameweeksError } = await supabase
      .from('fantasy_gameweeks')
      .select('id, gameweek_number')
      .eq('league_id', league.id)

    if (gameweeksError) throw gameweeksError

    const gameweekIds = (gameweeks || []).map((gameweek) => gameweek.id)
    const gameweekMap = new Map((gameweeks || []).map((gameweek) => [gameweek.id, gameweek]))

    if (gameweekIds.length > 0) {
      const { data: matches, error: matchesError } = await supabase
        .from('fantasy_matches')
        .select('*')
        .in('fantasy_gameweek_id', gameweekIds)
        .eq('status', 'scored')

      if (matchesError) throw matchesError

      const { data: entries, error: entriesError } = await supabase
        .from('fantasy_entries')
        .select('id, fantasy_gameweek_id, user_id, assigned_side')
        .in('fantasy_gameweek_id', gameweekIds)

      if (entriesError) throw entriesError

      const entryByGameweekAndUser = new Map()
      const entryIds = []

      for (const entry of entries || []) {
        entryByGameweekAndUser.set(`${entry.fantasy_gameweek_id}:${entry.user_id}`, entry)
        entryIds.push(entry.id)
      }

      const picksByEntry = new Map()

      if (entryIds.length > 0) {
        const { data: picks, error: picksError } = await supabase
          .from('fantasy_entry_picks')
          .select(`
            id,
            entry_id,
            selected_team_id,
            selected_team_name,
            selected_side,
            goals_for,
            goals_against,
            goal_difference,
            real_fixtures (
              id,
              home_team_name,
              away_team_name,
              home_score,
              away_score,
              kickoff_at,
              status
            )
          `)
          .in('entry_id', entryIds)

        if (picksError) throw picksError

        for (const pick of picks || []) {
          if (!picksByEntry.has(pick.entry_id)) picksByEntry.set(pick.entry_id, [])
          picksByEntry.get(pick.entry_id).push(formatPick(pick))
        }
      }

      for (const match of matches || []) {
        const home = table.get(match.home_user_id)
        const away = table.get(match.away_user_id)
        if (!home || !away) continue

        const homeScore = match.home_score || 0
        const awayScore = match.away_score || 0
        const gameweek = gameweekMap.get(match.fantasy_gameweek_id)
        const homeEntry = entryByGameweekAndUser.get(`${match.fantasy_gameweek_id}:${match.home_user_id}`)
        const awayEntry = entryByGameweekAndUser.get(`${match.fantasy_gameweek_id}:${match.away_user_id}`)
        const homePicks = homeEntry ? picksByEntry.get(homeEntry.id) || [] : []
        const awayPicks = awayEntry ? picksByEntry.get(awayEntry.id) || [] : []

        applyMatch(home, homeScore, awayScore)
        applyMatch(away, awayScore, homeScore)

        home.matches.push(buildMatchDetail({
          match,
          gameweek,
          playerSide: 'home',
          playerTeam: home.teamName,
          opponentTeam: away.teamName,
          playerScore: homeScore,
          opponentScore: awayScore,
          homeTeam: home.teamName,
          awayTeam: away.teamName,
          homeScore,
          awayScore,
          homePicks,
          awayPicks,
        }))

        away.matches.push(buildMatchDetail({
          match,
          gameweek,
          playerSide: 'away',
          playerTeam: away.teamName,
          opponentTeam: home.teamName,
          playerScore: awayScore,
          opponentScore: homeScore,
          homeTeam: home.teamName,
          awayTeam: away.teamName,
          homeScore,
          awayScore,
          homePicks,
          awayPicks,
        }))
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

function buildMatchDetail({
  match,
  gameweek,
  playerSide,
  playerTeam,
  opponentTeam,
  playerScore,
  opponentScore,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  homePicks,
  awayPicks,
}) {
  return {
    matchId: match.id,
    gameweekNumber: gameweek?.gameweek_number || null,
    playerSide,
    playerTeam,
    opponentTeam,
    playerScore,
    opponentScore,
    result: playerScore > opponentScore ? 'win' : playerScore < opponentScore ? 'loss' : 'draw',
    headToHead: {
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      result: homeScore > awayScore ? 'home_win' : awayScore > homeScore ? 'away_win' : 'draw',
    },
    homePicks,
    awayPicks,
  }
}

function formatPick(pick) {
  const fixture = pick.real_fixtures || {}
  return {
    pickId: pick.id,
    selectedTeamName: pick.selected_team_name,
    selectedSide: pick.selected_side,
    goalsFor: pick.goals_for ?? 0,
    goalsAgainst: pick.goals_against ?? 0,
    goalDifference: pick.goal_difference ?? 0,
    fixture: {
      id: fixture.id,
      homeTeamName: fixture.home_team_name,
      awayTeamName: fixture.away_team_name,
      homeScore: fixture.home_score,
      awayScore: fixture.away_score,
      kickoffAt: fixture.kickoff_at,
      status: fixture.status,
    },
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
