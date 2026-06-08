import { useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

export default function LeagueControls() {
  const [gameweekNumber, setGameweekNumber] = useState(1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function getUserId() {
    if (!supabaseConfigured) throw new Error('Supabase is not configured yet.')

    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user?.id

    if (!userId) throw new Error('Sign in first.')

    return userId
  }

  async function joinLeague() {
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const userId = await getUserId()

      const response = await fetch('/.netlify/functions/joinMainLeague', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Could not join league')
      }

      setMessage(`Joined ${data.league.name}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function generateMatchups() {
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/.netlify/functions/generateMatchups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameweekNumber: Number(gameweekNumber) }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Could not generate matchups')
      }

      const byeText = data.hasBye ? ' One player has a bye.' : ''
      setMessage(`Generated ${data.matchupCount} matchup(s) for Gameweek ${gameweekNumber}.${byeText}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="league-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow small">League controls</p>
          <h2>Join league and create matchups</h2>
        </div>
      </div>

      <div className="builder-controls">
        <button type="button" onClick={joinLeague} disabled={loading}>
          Join Main League
        </button>
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
        <button type="button" className="secondary-button" onClick={generateMatchups} disabled={loading}>
          Generate matchups
        </button>
      </div>

      {message && <p className="success-box">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
