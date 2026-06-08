import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

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
      item[String(header).trim()] = cells[index]?.trim() || ''
    })
    return item
  })
}

async function readFixtureFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json(sheet, { defval: '' })
  }

  const text = await file.text()
  return parseCsv(text)
}

function valueFrom(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key]
    }
  }
  return ''
}

function parseDate(value) {
  if (!value) return null

  if (value instanceof Date) {
    const date = new Date(value)
    date.setUTCHours(15, 0, 0, 0)
    return date.toISOString()
  }

  const raw = String(value).trim()

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const date = new Date(raw)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }

  const slashParts = raw.split(/[\/]/).map(Number)
  if (slashParts.length === 3) {
    const [day, month, year] = slashParts
    if (day && month && year) {
      return new Date(Date.UTC(year, month - 1, day, 15, 0, 0)).toISOString()
    }
  }

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()

  return null
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
    .filter((row) => valueFrom(row, ['HomeTeam', 'Home Team', 'Home', 'home_team']) && valueFrom(row, ['AwayTeam', 'Away Team', 'Away', 'away_team']))
    .map((row, index) => {
      const homeTeam = String(valueFrom(row, ['HomeTeam', 'Home Team', 'Home', 'home_team'])).trim()
      const awayTeam = String(valueFrom(row, ['AwayTeam', 'Away Team', 'Away', 'away_team'])).trim()
      const homeScore = parseScore(valueFrom(row, ['FTHG', 'Home Goals', 'HomeGoals', 'Home Score', 'HomeScore', 'home_score']))
      const awayScore = parseScore(valueFrom(row, ['FTAG', 'Away Goals', 'AwayGoals', 'Away Score', 'AwayScore', 'away_score']))
      const utcDate = parseDate(valueFrom(row, ['Date', 'date', 'Kickoff', 'Kickoff Date', 'Match Date']))
      const div = String(valueFrom(row, ['Div', 'League', 'Competition', 'competition']) || 'CSV').trim()
      const explicitGameweek = Number(valueFrom(row, ['Gameweek', 'GW', 'Round', 'Week', 'Matchday', 'gameweek']))

      return {
        id: `season-${div}-${index + 1}`,
        importGameweek: Number.isFinite(explicitGameweek) && explicitGameweek > 0 ? explicitGameweek : null,
        utcDate,
        status: homeScore !== null && awayScore !== null ? 'FINISHED' : 'SCHEDULED',
        competition: {
          code: div,
          name: div === 'E0' ? 'Premier League season replay' : `${div} season replay`,
        },
        season: {
          startDate: utcDate ? utcDate.slice(0, 10) : null,
        },
        homeTeam: {
          id: `${div}-home-${homeTeam}`,
          name: homeTeam,
        },
        awayTeam: {
          id: `${div}-away-${awayTeam}`,
          name: awayTeam,
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
  const matchesWithGameweek = matches.filter((match) => match.importGameweek)

  if (matchesWithGameweek.length === matches.length && matches.length > 0) {
    const grouped = new Map()
    for (const match of matches) {
      if (!grouped.has(match.importGameweek)) grouped.set(match.importGameweek, [])
      grouped.get(match.importGameweek).push(match)
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([gameweekNumber, fixtures]) => ({
        gameweekNumber,
        fixtures: fixtures.slice(0, fixturesPerGameweek),
      }))
      .filter((gameweek) => gameweek.fixtures.length === fixturesPerGameweek)
  }

  const sorted = [...matches].sort((a, b) => String(a.utcDate || '').localeCompare(String(b.utcDate || '')))
  const gameweeks = []

  for (let index = 0; index < sorted.length; index += fixturesPerGameweek) {
    const fixtures = sorted.slice(index, index + fixturesPerGameweek)
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
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

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
    setImportedCount(0)

    if (!file) return

    try {
      const rows = await readFixtureFile(file)
      const parsedMatches = buildMatchesFromRows(rows)

      if (parsedMatches.length < 10) {
        throw new Error('This file does not contain enough valid fixtures. Expected columns like Date, HomeTeam, AwayTeam, FTHG and FTAG, or Home Team, Away Team, Home Goals and Away Goals.')
      }

      setMatches(parsedMatches)
      setMessage(`Loaded ${parsedMatches.length} fixtures into ${Math.floor(parsedMatches.length / 10)} fantasy gameweeks. Click Import full season to save every week.`)
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
      sourceName: fileName || 'Uploaded file',
    })
    setMessage(`Gameweek ${nextGameweekNumber} loaded into the Admin Builder.`)
  }

  async function saveGameweek(gameweek) {
    const response = await fetch('/.netlify/functions/saveGameweek', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        competition: gameweek.fixtures[0]?.competition?.code || 'CSV',
        competitionName: `Season replay ${seasonName}`,
        gameweekNumber: Number(gameweek.gameweekNumber),
        fixtures: gameweek.fixtures,
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || data.error || `Could not save Gameweek ${gameweek.gameweekNumber}`)
    return data
  }

  async function importFullSeason() {
    if (gameweeks.length === 0) return

    setImporting(true)
    setError('')
    setMessage('Importing full season...')
    setImportedCount(0)

    try {
      for (let index = 0; index < gameweeks.length; index += 1) {
        await saveGameweek(gameweeks[index])
        setImportedCount(index + 1)
      }

      setMessage(`Imported ${gameweeks.length} gameweeks. Gameweek 1 is now ready in Player view.`)
      loadSelectedGameweek(1)
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
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
          <h2>Upload full season fixtures/results</h2>
        </div>
        <p>{gameweeks.length} gameweeks</p>
      </div>

      <div className="builder-controls">
        <label>
          Season CSV or Excel
          <input type="file" accept=".csv,.xlsx,.xls,text/csv" onChange={handleFileUpload} />
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

        <button type="button" onClick={() => loadSelectedGameweek()} disabled={!activeGameweek || importing}>
          Load gameweek
        </button>

        <button type="button" className="secondary-button" onClick={importFullSeason} disabled={gameweeks.length === 0 || importing}>
          {importing ? `Importing ${importedCount}/${gameweeks.length}` : 'Import full season'}
        </button>

        <button type="button" className="secondary-button" onClick={loadNextGameweek} disabled={gameweeks.length === 0 || Number(gameweekNumber) >= gameweeks.length || importing}>
          Advance to next gameweek
        </button>
      </div>

      {matches.length === 0 && !error && (
        <div className="empty-state">
          Upload a full season CSV or Excel file. The importer groups fixtures into fantasy gameweeks of 10 and saves the results too.
        </div>
      )}

      {activeGameweek && (
        <div className="account-card season-summary-card">
          <strong>{fileName || 'Uploaded file'} - {seasonName}</strong>
          <span>Gameweek {activeGameweek.gameweekNumber}: {activeGameweek.fixtures[0]?.homeTeam?.name} vs {activeGameweek.fixtures[0]?.awayTeam?.name} through {activeGameweek.fixtures.at(-1)?.homeTeam?.name} vs {activeGameweek.fixtures.at(-1)?.awayTeam?.name}</span>
          <span>The results are saved with each fixture, so score the gameweek without pressing Simulate results.</span>
        </div>
      )}

      {message && <p className="success-box">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
