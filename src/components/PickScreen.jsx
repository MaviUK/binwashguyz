import { useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { loadPlayerMatchupFromSupabase } from '../lib/loadPlayerMatchup'
import './PickScreen.css'

const PICK_SCREEN_VERSION = 'auto-next-week-v1'

function formatKickoff(kickoffAt) {
  if (!kickoffAt) return 'Kickoff TBC'

  return new Date(kickoffAt).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PickScreen() {
  const [gameweekNumber, setGameweekNumber] = useState(1)
  const [assignedSide, setAssignedSide] = useState('home')
  const [matchup, setMatchup] = useState(null)
  const [player, setPlayer] = useState(null)
  const [opponent, setOpponent] = useState(null)
  const [gameweek, setGameweek] = useState(null)
  const [fixtures, setFixtures] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function getUserId() {
    if (!supabaseConfigured) throw new Error('Supabase is not configured yet.')

    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user?.id

    if (!userId) throw new Error('Sign in before loading your matchup.')

    return userId
  }

  async function findCurrentGameweekNumber(userId) {
    const { data: gameweeks, error: gameweeksError } = await supabase
      .from('fantasy_gameweeks')
      .select('id, gameweek_number, status')
      .order('gameweek_number', { ascending: true })

    if (gameweeksError) throw gameweeksError
    if (!gameweeks || gameweeks.length === 0) throw new Error('No gameweeks have been imported yet.')

    const { data: matchups, error: matchupsError } = await supabase
      .from('fantasy_matches')
      .select('fantasy_gameweek_id')
      .or(`home_user_id.eq.${userId},away_user_id.eq.${userId}`)

    if (matchupsError) throw matchupsError

    const { data: entries, error: entriesError } = await supabase
      .from('fantasy_entries')
      .select('fantasy_gameweek_id, status')
      .eq('user_id', userId)
      .eq('status', 'submitted')

    if (entriesError) throw entriesError

    const matchupGameweekIds = new Set((matchups || []).map((item) => item.fantasy_gameweek_id))
    const submittedGameweekIds = new Set((entries || []).map((item) => item.fantasy_gameweek_id))
    const unscoredGameweeks = gameweeks.filter((item) => item.status !== 'scored')

    const firstUnpickedWithMatchup = unscoredGameweeks.find(
      (item) => matchupGameweekIds.has(item.id) && !submittedGameweekIds.has(item.id)
    )

    if (firstUnpickedWithMatchup) return firstUnpickedWithMatchup.gameweek_number

    const firstOpenWithMatchup = unscoredGameweeks.find((item) => matchupGameweekIds.has(item.id))
    if (firstOpenWithMatchup) return firstOpenWithMatchup.gameweek_number

    const firstUnscored = unscoredGameweeks[0]
    if (firstUnscored) return firstUnscored.gameweek_number

    throw new Error('All imported gameweeks are complete.')
  }

  async function loadGameweekAndMatchup(nextGameweekNumber = gameweekNumber, options = {}) {
    setLoading(true)
    setError('')
    if (!options.keepMessage) setMessage('')
    setSelectedIds([])
    setMatchup(null)
    setPlayer(null)
    setOpponent(null)

    try {
      const userId = await getUserId()
      const cleanGameweekNumber = Number(nextGameweekNumber)
      const data = await loadPlayerMatchupFromSupabase(supabase, userId, cleanGameweekNumber)

      setGameweekNumber(cleanGameweekNumber)
      setAssignedSide(data.assignedSide)
      setMatchup(data.matchup)
      setPlayer(data.player)
      setOpponent(data.opponent)
      setGameweek(data.gameweek)
      setFixtures((data.fixtures || []).slice(0, 10))

      if (options.successMessage) setMessage(options.successMessage)
    } catch (err) {
      setError(err.message)
      setGameweek(null)
      setFixtures([])
    } finally {
      setLoading(false)
    }
  }

  async function loadCurrentGameweek() {
    setLoading(true)
    setError('')
    setMessage('')
    setSelectedIds([])
    setMatchup(null)
    setPlayer(null)
    setOpponent(null)

    try {
      const userId = await getUserId()
      const currentGameweekNumber = await findCurrentGameweekNumber(userId)
      await loadGameweekAndMatchup(currentGameweekNumber, {
        successMessage: `Loaded current Gameweek ${currentGameweekNumber}.`,
      })
    } catch (err) {
      setError(err.message)
      setGameweek(null)
      setFixtures([])
      setLoading(false)
    }
  }

  function togglePick(fixtureId) {
    const id = String(fixtureId)
    setError('')
    setMessage('')

    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id)
      }

      if (current.length >= 3) {
        setError('You can only pick 3 teams.')
        return current
      }

      return [...current, id]
    })
  }

  async function submitPicks() {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const userId = await getUserId()

      if (!gameweek?.id) {
        throw new Error('Load your saved gameweek before submitting picks.')
      }

      if (!matchup?.id) {
        throw new Error('Load your matchup before submitting picks.')
      }

      if (selectedIds.length !== 3) {
        throw new Error('Select exactly 3 teams before submitting.')
      }

      const selectedFixtures = fixtures.filter((fixture) => selectedIds.includes(String(fixture.id)))
      const picks = selectedFixtures.map((fixture) => {
        const isHome = assignedSide === 'home'

        return {
          realFixtureId: fixture.id,
          selectedTeamId: isHome ? fixture.home_team_id : fixture.away_team_id,
          selectedTeamName: isHome ? fixture.home_team_name : fixture.away_team_name,
        }
      })

      const response = await fetch('/.netlify/functions/saveEntryPicks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          gameweekId: gameweek.id,
          assignedSide,
          picks,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Could not save picks.')
      }

      const nextGameweekNumber = Number(gameweek.gameweek_number) + 1
      setSaving(false)
      await loadGameweekAndMatchup(nextGameweekNumber, {
        keepMessage: true,
        successMessage: `Picks submitted. ${data.pickCount || 0} teams saved. Loaded Gameweek ${nextGameweekNumber}.`,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const playerName = player?.team_name || 'Your team'
  const opponentName = opponent?.team_name || 'Opponent'
  const homeFantasyTeam = assignedSide === 'home' ? playerName : opponentName
  const awayFantasyTeam = assignedSide === 'home' ? opponentName : playerName

  return (
    <section className="pick-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow small">Player picks - {PICK_SCREEN_VERSION}</p>
          <h2>Weekly matchup</h2>
        </div>
        <p>{selectedIds.length}/3 picked</p>
      </div>

      <div className="builder-controls">
        <label>
          Gameweek
          <input
            type="number"
            min="1"
            max="38"
            value={gameweekNumber}
            onChange={(event) => setGameweekNumber(event.target.value)}
          />
        </label>
        <button type="button" onClick={loadCurrentGameweek} disabled={loading}>
          {loading ? 'Loading...' : 'Load current week'}
        </button>
        <button type="button" className="secondary-button" onClick={() => loadGameweekAndMatchup()} disabled={loading}>
          Load selected week
        </button>
      </div>

      {!gameweek && !loading && (
        <div className="empty-state">
          Load the current gameweek to see your VS and this week&apos;s 10 fixtures.
        </div>
      )}

      {gameweek && matchup && (
        <div className="week-matchup-card">
          <p className="eyebrow small">Gameweek {gameweek.gameweek_number}</p>
          <div className="week-versus-row">
            <strong>{homeFantasyTeam}</strong>
            <span>vs</span>
            <strong>{awayFantasyTeam}</strong>
          </div>
          <div className="week-meta-row">
            <span>You are {assignedSide.toUpperCase()}</span>
            <span>Deadline: {gameweek.deadline_at ? formatKickoff(gameweek.deadline_at) : 'TBC'}</span>
            <span>{fixtures.length}/10 fixtures</span>
          </div>
        </div>
      )}

      {fixtures.length > 0 && (
        <div className="weekly-fixtures-block">
          <div className="panel-header compact-header">
            <div>
              <p className="eyebrow small">This week&apos;s fixtures</p>
              <h2>Pick 3 {assignedSide} teams</h2>
            </div>
          </div>

          <div className="week-fixture-list">
            {fixtures.map((fixture, index) => {
              const selected = selectedIds.includes(String(fixture.id))
              const eligibleTeamName = assignedSide === 'home' ? fixture.home_team_name : fixture.away_team_name
              const ineligibleTeamName = assignedSide === 'home' ? fixture.away_team_name : fixture.home_team_name

              return (
                <button
                  key={fixture.id}
                  type="button"
                  className={`week-fixture-card ${selected ? 'selected' : ''}`}
                  onClick={() => togglePick(fixture.id)}
                >
                  <span className="fixture-number">{index + 1}</span>
                  <span className="fixture-main">
                    <strong>{fixture.home_team_name}</strong>
                    <em>vs</em>
                    <strong>{fixture.away_team_name}</strong>
                  </span>
                  <span className="fixture-pick-text">
                    Your pick: <strong>{eligibleTeamName}</strong>
                    <small>Opponent side: {ineligibleTeamName}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {fixtures.length > 0 && (
        <button type="button" onClick={submitPicks} disabled={saving || loading || selectedIds.length !== 3}>
          {saving ? 'Submitting...' : 'Submit 3 picks'}
        </button>
      )}

      {message && <p className="success-box">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
