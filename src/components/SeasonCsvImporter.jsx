import { useMemo, useState } from 'react'

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(value)
      value = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1
      row.push(value)
      if (row.some((cell) => cell !== '')) rows.push(row)
      row = []
      value = ''
      continue
    }

    value += char
  }

  row.push(value)
  if (row.some((cell) => cell !== '')) rows.push(row)

  const headers = rows[0] || []

  return rows.slice(1).map((cells) => {
    const item = {}
    headers.forEach((header, index) => {
      item[header.trim()] = cells[index]?.trim() || ''
    })
    return item
  })
}

function parseFootballDataDate(value) {
  const [day, month, year] = String(value || '').split('/').map(Number)
  if (!day || !month || !year) return null

  return new Date(Date.UTC(year, month - 1, day, 15, 0, 0)).toISOString()
}

function parseScore(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getSeasonName(matches) {
  const years = matches
    .map((match) => new Date(match.utcDate).getUTCFullYear())
    .filter((year) => Number.isFinite(year))

  if (years.length === 0) return 'Uploaded Season'

  const firstYear = Math.min(...years)
  const lastYear = Math.max(...years)

  if (firstYear === lastYear) return String(firstYear)

  return `${firstYear}/${String(lastYear).slice(-2)}`
}

function buildMatchesFromRows(rows) {
  return rows
    .filter((row) => row.HomeTeam && row.AwayTeam && row.Date)
    .map((row, index) => {
      const homeScore = parseScore(row.FTHG)
      const awayScore = parseScore(row.FTAG)
      const utcDate = parseFootballDataDate(row.Date)
      const div = row.Div || 'CSV'

      return {
        id: `season-${div}-${index + 1}`,
        utcDate,
        status: 'SCHEDULED',
        competition: {
          code: div,
          name: div === 'E0' ? 'Premier League season replay' : `${div} season replay`,
        },
        season: {
          startDate: utcDate ? utcDate.slice(0, 10) : null,
        },
        homeTeam: {
          id: `${div}-home-${row.HomeTeam}`,
          name: row.HomeTeam,
        },
        awayTeam: {
          id: `${div}-away-${row.AwayTeam}`,
          name: row.AwayTeam,
        },
        score: {
          fullTime: {
            home: homeScore,
            away: awayScore,
          },
        },
        csvRow: row,
      }
    })
}

function chunkIntoGameweeks(matches, fixturesPerGameweek = 10) {
  const gameweeks = []

  for (let index = 0; index < matches.length; index += fixturesPerGameweek) {
    const fixtures = matches.slice(index, index + fixturesPerGameweek)
    if (fixtures.length === fixturesPerGameweek) {
      gameweeks.push({
        gameweekNumber: gameweeks.length + 1,
        fixtures,
      })
    }
  }

  return gameweeks
}

export default function SeasonCsvImporter({ onLoadGameweek }) {
  const [fileName, setFileName] = useState('')
  const [matches, setMatches] = useState([])
  const [gameweekNumber, setGameweekNumber] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const gameweeks = useMemo(() => chunkIntoGameweeks(matches), [matches])
  const seasonName = useMemo(() => getSeasonName(matches), [matches])
  const activeGameweek = gameweeks.find((item) => item.gameweekNumber === Number(gameweekNumber))

  async function handleFileUpload(event) {
    const file = event.target.files?.[0]
    setError('')
    setMessage('')
    setMatches([])
    setFileName(file?.name || '')
    setGameweekNumber(1)

    if (!file) return

    try {
      const text = await file.text()
      const rows = parseCsv(text)
      const parsedMatches = buildMatchesFromRows(rows)

      if (parsedMatches.length < 10) {
        throw new Error('This file does not contain enough valid fixtures. Expected football-data columns like Date, HomeTeam, AwayTeam, FTHG and FTAG.')
      }

      setMatches(parsedMatches)
      setMessage(`Loaded ${parsedMatches.length} fixtures into ${Math.floor(parsedMatches.length / 10)} fantasy gameweeks.`)
    } catch (err) {
      setError(err.message)
    }
  }

  function loadSelectedGameweek(nextGameweekNumber = Number(gameweekNumber)) {
    const gameweek = gameweeks.find((item) => item.gameweekNumber === nextGameweekNumber)

    if (!gameweek) {
      setError(`Gameweek ${nextGameweekNumber} is not available in this upload.`)
      return
    }

    setError('')
    setGameweekNumber(nextGameweekNumber)
    onLoadGameweek({
      matches: gameweek.fixtures,
      gameweekNumber: nextGameweekNumber,
      seasonName,
      sourceName: fileName || 'Uploaded CSV',
    })
    setMessage(`Gameweek ${nextGameweekNumber} loaded into the Admin Builder. Save it there before users pick.`)
  }

  function loadNextGameweek() {
    const next = Math.min(Number(gameweekNumber) + 1, gameweeks.length)
    loadSelectedGameweek(next)
  }

  return (
    <section className="season-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow small">Season replay</p>
          <h2>Upload this season CSV</h2>
        </div>
        <p>{gameweeks.length} gameweeks</p>
      </div>

      <div className="builder-controls">
        <label>
          Football-data CSV
          <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} />
        </label>

        <label>
          Gameweek
          <input
            type="number"
            min="1"
            max={Math.max(gameweeks.length, 1)}
            value={gameweekNumber}
            onChange={(event) => setGameweekNumber(event.target.value)}
          />
        </label>

        <button type="button" onClick={() => loadSelectedGameweek()} disabled={!activeGameweek}>
          Load gameweek
        </button>

        <button type="button" className="secondary-button" onClick={loadNextGameweek} disabled={gameweeks.length === 0 || Number(gameweekNumber) >= gameweeks.length}>
          Advance to next gameweek
        </button>
      </div>

      {matches.length === 0 && !error && (
        <div className="empty-state">
          Upload a football-data CSV like E0.csv. The importer groups the 380 Premier League fixtures into 38 fantasy gameweeks of 10 fixtures.
        </div>
      )}

      {activeGameweek && (
        <div className="account-card season-summary-card">
          <strong>{fileName || 'Uploaded CSV'} - {seasonName}</strong>
          <span>Gameweek {activeGameweek.gameweekNumber}: {activeGameweek.fixtures[0]?.homeTeam?.name} vs {activeGameweek.fixtures[0]?.awayTeam?.name} through {activeGameweek.fixtures.at(-1)?.homeTeam?.name} vs {activeGameweek.fixtures.at(-1)?.awayTeam?.name}</span>
          <span>The results are stored with the fixtures, so you can score the gameweek without pressing Simulate results.</span>
        </div>
      )}

      {message && <p className="success-box">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
