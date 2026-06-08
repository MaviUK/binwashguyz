import { useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { loadPlayerMatchupFromSupabase } from '../lib/loadPlayerMatchup'

const PICK_SCREEN_VERSION = 'direct-picks-v4'

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
      const data = await loadPlayerMatchupFromSupabase(supabase, userId, gameweekNumber)

      setAssignedSide(data.assignedSide)
      setMatchup(data.matchup)
      setOpponent(data.opponent)
      setGameweek(data.gameweek)
      setFixtures(data.fixtures || [])
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

      const { data: entry, error: entryError } = await supabase
        .from('fantasy_entries')
        .upsert(
          {
            fantasy_gameweek_id: gameweek.id,
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
      if (!entry?.id) throw new Error('Could not save your entry.')

      const rows = selectedFixtures.map((fixture) => {
        const isHome = assignedSide === 'home'

        return {
          entry_id: entry.id,
          real_fixture_id: fixture.id,
          selected_team_id: isHome ? fixture.home_team_id : fixture.away_team_id,
          selected_team_name: isHome ? fixture.home_team_name : fixture.away_team_name,
          selected_side: assignedSide,
        }
      })

      const { data: savedPicks, error: picksError } = await supabase
        .from('fantasy_entry_picks')
        .upsert(rows, {
          onConflict: 'entry_id,real_fixture_id',
        })
        .select()

      if (picksError) throw picksError

      setMessage(`Picks submitted. ${savedPicks?.length || 0} teams saved.`)
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
          <p className="eyebrow small">Player picks - {PICK_SCREEN_VERSION}</p>
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
          {loading ? 'Loading...' : 'Load direct matchup'}
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
