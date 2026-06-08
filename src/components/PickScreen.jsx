import { useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

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

  async function loadGameweekAndMatchup() {
    setLoading(true)
    setError('')
    setMessage('')
    setSelectedIds([])
    setMatchup(null)
    setOpponent(null)

    try {
      const userId = await getUserId()

      const matchupResponse = await fetch(
        `/.netlify/functions/getMyMatchup?gameweek=${gameweekNumber}&userId=${userId}`
      )
      const matchupData = await matchupResponse.json()

      if (!matchupResponse.ok) {
        throw new Error(matchupData.message || matchupData.error || 'Could not load your matchup')
      }

      setAssignedSide(matchupData.assignedSide)
      setMatchup(matchupData.matchup)
      setOpponent(matchupData.opponent)
      setGameweek(matchupData.gameweek)
      setFixtures(matchupData.fixtures || [])
    } catch (err) {
      setError(err.message)
      setGameweek(null)
      setFixtures([])
    } finally {
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
        throw new Error(data.message || data.error || 'Could not submit picks')
      }

      setMessage(`Picks submitted. ${data.pickCount} teams saved.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="pick-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow small">Player picks</p>
          <h2>Choose your 3 teams</h2>
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
        <button type="button" onClick={loadGameweekAndMatchup} disabled={loading}>
          {loading ? 'Loading...' : 'Load my matchup'}
        </button>
      </div>

      {!gameweek && !loading && (
        <div className="empty-state">
          Join the league, create Gameweek 1, generate matchups, then load your matchup here.
        </div>
      )}

      {gameweek && matchup && (
        <div className="account-card matchup-card">
          <strong>
            You are the {assignedSide === 'home' ? 'home' : 'away'} player for Gameweek{' '}
            {gameweek.gameweek_number}.
          </strong>
          <span>Opponent: {opponent?.team_name || 'Opponent profile not found'}</span>
          <span>Deadline: {gameweek.deadline_at ? formatKickoff(gameweek.deadline_at) : 'TBC'}</span>
        </div>
      )}

      {fixtures.length > 0 && (
        <div className="pick-list">
          {fixtures.map((fixture) => {
            const selected = selectedIds.includes(String(fixture.id))
            const teamName = assignedSide === 'home' ? fixture.home_team_name : fixture.away_team_name
            const opponentName = assignedSide === 'home' ? fixture.away_team_name : fixture.home_team_name

            return (
              <button
                key={fixture.id}
                type="button"
                className={`pick-card ${selected ? 'selected' : ''}`}
                onClick={() => togglePick(fixture.id)}
              >
                <span>
                  Pick <strong>{teamName}</strong>
                </span>
                <small>
                  vs {opponentName} - {formatKickoff(fixture.kickoff_at)}
                </small>
              </button>
            )
          })}
        </div>
      )}

      {fixtures.length > 0 && (
        <button type="button" onClick={submitPicks} disabled={saving || selectedIds.length !== 3}>
          {saving ? 'Submitting...' : 'Submit 3 picks'}
        </button>
      )}

      {message && <p className="success-box">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
