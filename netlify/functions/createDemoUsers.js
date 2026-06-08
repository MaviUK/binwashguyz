import { createClient } from '@supabase/supabase-js'

const DEFAULT_LEAGUE_NAME = 'Main League'
const DEFAULT_SEASON_NAME = '2026/27'
const DEMO_PASSWORD = 'DemoPass123!'
const DEMO_TEAMS = [
  'Demo Rovers',
  'Demo Albion',
  'Demo Athletic',
  'Demo United',
  'Demo City',
  'Demo Wanderers',
  'Demo County',
  'Demo Rangers',
  'Demo Town',
  'Demo Hotspur',
  'Demo Villa',
  'Demo Forest',
]

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
    const requestedCount = Number(payload.count || 8)
    const count = Math.min(Math.max(requestedCount, 2), DEMO_TEAMS.length)

    const supabase = createClient(supabaseUrl, serviceRoleKey)

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

    const createdUsers = []

    for (let index = 0; index < count; index += 1) {
      const number = index + 1
      const email = `demo${number}@goal-diff.test`
      const username = `demo${number}`
      const teamName = DEMO_TEAMS[index]

      const user = await createOrFindUser(supabase, email)

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username,
          team_name: teamName,
        })

      if (profileError) throw profileError

      const { error: memberError } = await supabase
        .from('league_members')
        .upsert(
          {
            league_id: league.id,
            user_id: user.id,
          },
          { onConflict: 'league_id,user_id' }
        )

      if (memberError) throw memberError

      createdUsers.push({
        email,
        password: DEMO_PASSWORD,
        username,
        teamName,
        userId: user.id,
      })
    }

    return jsonResponse(200, {
      league,
      count: createdUsers.length,
      demoPassword: DEMO_PASSWORD,
      users: createdUsers,
    })
  } catch (error) {
    return jsonResponse(500, { error: error.message })
  }
}

async function createOrFindUser(supabase, email) {
  const existing = await findUserByEmail(supabase, email)

  if (existing) return existing

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })

  if (error) {
    const fallback = await findUserByEmail(supabase, email)
    if (fallback) return fallback
    throw error
  }

  return data.user
}

async function findUserByEmail(supabase, email) {
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    })

    if (error) throw error

    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (found) return found

    if (data.users.length < 100) break
  }

  return null
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
