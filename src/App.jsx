import { useMemo, useState } from 'react'
import AuthPanel from './components/AuthPanel'
import GameweekBuilder from './components/GameweekBuilder'
import LeagueControls from './components/LeagueControls'
import LeagueTable from './components/LeagueTable'
import PickScreen from './components/PickScreen'
import ScoringPanel from './components/ScoringPanel'
import SeasonCsvImporter from './components/SeasonCsvImporter'
import './App.css'

const COMPETITIONS = [
  { code: 'PL', name: 'Premier League' },
  { code: 'ELC', name: 'Championship' },
  { code: 'PD', name: 'La Liga' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'SA', name: 'Serie A' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'CL', name: 'Champions League' },
  { code: 'TEST', name: 'Test Fixture League' },
  { code: 'E0', name: 'Premier League season replay' },
]

const TEST_TEAMS = [
  'Bangor Rovers',
  'Groomsport United',
  'Holywood Albion',
  'Newtownards Town',
  'Comber City',
  'Donaghadee Athletic',
  'Millisle Wanderers',
  'Conlig County',
  'Ballyholme FC',
  'Clandeboye Rangers',
  'Crawfordsburn Villa',
  'Helen Bay Hotspur',
  'Dundonald Forest',
  'Ards Athletic',
  'Greyabbey Town',
  'Portaferry United',
  'Kircubbin Rovers',
  'Ballywalter City',
  'Loughview FC',
  'Castle Park Albion',
  'Seacliff Rangers',
  'Harbour Athletic',
  'Abbey Villa',
  'North Down County',
]

function formatKickoff(utcDate) {
  if (!utcDate) return 'Kickoff TBC'

  return new Date(utcDate).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getScoreText(match) {
  const home = match?.score?.fullTime?.home
  const away = match?.score?.fullTime?.away

  if (home === null || home === undefined || away === null || away === undefined) {
    return match.status || 'SCHEDULED'
  }

  return `${home} - ${away}`
}

function buildTestFixtures() {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 3)
  startDate.setHours(15, 0, 0, 0)

  return Array.from({ length: 12 }, (_, index) => {
    const kickoff = new Date(startDate)
    kickoff.setDate(startDate.getDate() + Math.floor(index / 4))
    kickoff.setHours(15 + (index % 4), 0, 0, 0)

    const homeTeamName = TEST_TEAMS[index * 2]
    const awayTeamName = TEST_TEAMS[index * 2 + 1]

    return {
      id: `test-fixture-${index + 1}`,
      utcDate: kickoff.toISOString(),
      status: 'SCHEDULED',
      competition: {
        code: 'TEST',
        name: 'Test Fixture League',
      },
      season: {
        startDate: '2026-01-01',
      },
      homeTeam: {
        id: `test-home-${index + 1}`,
        name: homeTeamName,
      },
      awayTeam: {
        id: `test-away-${index + 1}`,
        name: awayTeamName,
      },
      score: {
        fullTime: {
          home: null,
          away: null,
        },
      },
    }
  })
}

function App() {
  const [competition, setCompetition] = useState('PL')
  const [competitionNameOverride, setCompetitionNameOverride] = useState('')
  const [builderGameweekNumber, setBuilderGameweekNumber] = useState(1)
  const [mode, setMode] = useState('SCHEDULED')
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastLoaded, setLastLoaded] = useState('')

  const selectedCompetition = useMemo(
    () => COMPETITIONS.find((item) => item.code === competition),
    [competition]
  )

  const competitionName = competitionNameOverride || selectedCompetition?.name || competition

  function loadTestFixtures() {
    setError('')
    setCompetition('TEST')
    setCompetitionNameOverride('')
    setMode('SCHEDULED')
    setMatches(buildTestFixtures())
    setLastLoaded(`${new Date().toLocaleString('en-GB')} - test fixtures`)
  }

  function handleSeasonGameweekLoad({ matches: seasonMatches, gameweekNumber, seasonName, sourceName }) {
    setError('')
    setCompetition('E0')
    setCompetitionNameOverride(`Premier League ${seasonName}`)
    setMode('SCHEDULED')
    setMatches(seasonMatches)
    setBuilderGameweekNumber(gameweekNumber)
    setLastLoaded(`${new Date().toLocaleString('en-GB')} - ${sourceName} Gameweek ${gameweekNumber}`)
  }

  async function loadMatches(nextMode = mode) {
    setLoading(true)
    setError('')
    setMode(nextMode)
    setCompetitionNameOverride('')

    try {
      const endpoint = nextMode === 'FINISHED' ? 'updateResults' : 'fetchFixtures'
      const response = await fetch(
        `/.netlify/functions/${endpoint}?competition=${competition}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Could not load football data')
      }

      setMatches(data.matches || [])
      setLastLoaded(new Date().toLocaleString('en-GB'))
    } catch (err) {
      setError(err.message)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      <section className="hero">
        <p className="eyebrow">Goal Diff Fantasy</p>
        <h1>Pick 3 teams. Win on real goal difference.</h1>
        <p className="intro">
          A head-to-head football prediction game. Each user gets 10 real fixtures,
          picks 3 eligible teams, and scores their combined real-life goal difference.
        </p>

        <div className="controls">
          <label>
            Competition
            <select value={competition} onChange={(event) => setCompetition(event.target.value)}>
              {COMPETITIONS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="button-row">
            <button type="button" onClick={() => loadMatches('SCHEDULED')} disabled={loading}>
              {loading && mode === 'SCHEDULED' ? 'Loading...' : 'Load upcoming fixtures'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => loadMatches('FINISHED')}
              disabled={loading}
            >
              {loading && mode === 'FINISHED' ? 'Loading...' : 'Load latest results'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={loadTestFixtures}
              disabled={loading}
            >
              Load test fixtures
            </button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {lastLoaded && <p className="loaded-note">Last loaded: {lastLoaded}</p>}
      </section>

      <AuthPanel />

      <SeasonCsvImporter onLoadGameweek={handleSeasonGameweekLoad} />

      <LeagueControls />

      <GameweekBuilder
        matches={matches}
        competition={competition}
        competitionName={competitionName}
        gameweekNumber={builderGameweekNumber}
        onGameweekNumberChange={setBuilderGameweekNumber}
      />

      <PickScreen />

      <ScoringPanel />

      <LeagueTable />

      <section className="rules-grid" aria-label="Game rules summary">
        <article>
          <span>1</span>
          <h2>10 fixtures</h2>
          <p>Each fantasy gameweek is built from 10 real football fixtures.</p>
        </article>
        <article>
          <span>2</span>
          <h2>Home vs away</h2>
          <p>The fantasy home user can only pick home teams. The away user can only pick away teams.</p>
        </article>
        <article>
          <span>3</span>
          <h2>Pick 3</h2>
          <p>Each user chooses 3 teams and scores the combined goal difference.</p>
        </article>
      </section>

      <section className="fixtures">
        <div className="panel-header">
          <div>
            <p className="eyebrow small">{mode === 'FINISHED' ? 'Results' : 'Fixtures'}</p>
            <h2>{competitionName}</h2>
          </div>
          <p>{matches.length} matches</p>
        </div>

        {matches.length === 0 && !loading && !error && (
          <div className="empty-state">
            Choose a competition, then load upcoming fixtures, latest results, test fixtures, or upload a season CSV.
          </div>
        )}

        <div className="match-list">
          {matches.map((match) => (
            <article className="fixture-card" key={match.id}>
              <div className="team-row">
                <strong>{match.homeTeam?.name || 'Home team TBC'}</strong>
                <span className="score-pill">{getScoreText(match)}</span>
                <strong>{match.awayTeam?.name || 'Away team TBC'}</strong>
              </div>
              <div className="meta-row">
                <span>{formatKickoff(match.utcDate)}</span>
                <span>{match.competition?.name || competitionName}</span>
                <span>{match.status}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
