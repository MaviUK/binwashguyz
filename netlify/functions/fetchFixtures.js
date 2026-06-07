export async function handler(event) {
  try {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY

    if (!apiKey) {
      return jsonResponse(500, {
        error: 'Missing FOOTBALL_DATA_API_KEY. Add it in Netlify environment variables.',
      })
    }

    const competition = event.queryStringParameters?.competition || 'PL'
    const dateFrom = event.queryStringParameters?.dateFrom
    const dateTo = event.queryStringParameters?.dateTo

    const params = new URLSearchParams({ status: 'SCHEDULED' })
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    const url = `https://api.football-data.org/v4/competitions/${competition}/matches?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': apiKey,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return jsonResponse(response.status, data)
    }

    return jsonResponse(200, {
      provider: 'football-data.org',
      competition,
      status: 'SCHEDULED',
      count: data.count || data.matches?.length || 0,
      matches: data.matches || [],
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
