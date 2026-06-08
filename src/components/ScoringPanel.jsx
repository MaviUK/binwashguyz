import { useState } from 'react'

export default function ScoringPanel() {
  const [gameweekNumber, setGameweekNumber] = useState(1)
  const [syncResults, setSyncResults] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function scoreGameweek() {
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/.netlify/functions/syncAndScoreGameweek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameweekNumber: Number(gameweekNumber),
          syncResults,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Could not score gameweek')
      }

      setMessage(
        `Scored ${data.matchesScored} match(es), ${data.picksScored} pick(s), ${data.finishedFixtures}/${data.fixturesChecked} fixture(s) finished.`
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="scoring-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow small">Scoring</p>
          <h2>Score gameweek results</h2>
        </div>
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
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={syncResults}
            onChange={(event) => setSyncResults(event.target.checked)}
          />
          Sync latest real results first
        </label>
        <button type="button" onClick={scoreGameweek} disabled={loading}>
          {loading ? 'Scoring...' : 'Score gameweek'}
        </button>
      </div>

      {message && <p className="success-box">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
