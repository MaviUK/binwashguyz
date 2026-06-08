import { useMemo, useState } from 'react'

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

export default function GameweekBuilder({
  matches,
  competition,
  competitionName,
  gameweekNumber,
  onGameweekNumberChange,
}) {
  const [selectedIds, setSelectedIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const availableMatches = useMemo(
    () => matches.filter((match) => match.status === 'SCHEDULED' || match.status === 'TIMED'),
    [matches]
  )

  const selectedMatches = useMemo(
    () => availableMatches.filter((match) => selectedIds.includes(String(match.id))),
    [availableMatches, selectedIds]
  )

  function setGameweekNumber(value) {
    onGameweekNumberChange?.(value)
  }

  function toggleFixture(matchId) {
    const id = String(matchId)

    setMessage('')
    setError('')

    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id)
      }

      if (current.length >= 10) {
        setError('You can only select 10 fixtures for a fantasy gameweek.')
        return current
      }

      return [...current, id]
    })
  }

  function selectAllShownFixtures() {
    setError('')
    setMessage('')
    setSelectedIds(availableMatches.slice(0, 10).map((match) => String(match.id)))
  }

  async function saveGameweek() {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      if (selectedMatches.length !== 10) {
        throw new Error('Select exactly 10 fixtures before saving the gameweek.')
      }

      const response = await fetch('/.netlify/functions/saveGameweek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competition,
          competitionName,
          gameweekNumber: Number(gameweekNumber),
          fixtures: selectedMatches,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Could not save gameweek')
      }

      setMessage(`Gameweek ${gameweekNumber} saved with ${data.fixtureCount} fixtures.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="builder-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow small">Admin builder</p>
          <h2>Create fantasy gameweek</h2>
        </div>
        <p>{selectedIds.length}/10 selected</p>
      </div>

      <div className="builder-controls">
        <label>
          Gameweek number
          <input
            type="number"
            min="1"
            max="38"
            value={gameweekNumber}
            onChange={(event) => setGameweekNumber(event.target.value)}
          />
        </label>
        <button type="button" className="secondary-button" onClick={selectAllShownFixtures} disabled={availableMatches.length < 10}>
          Select shown 10
        </button>
        <button type="button" onClick={saveGameweek} disabled={saving || selectedIds.length !== 10}>
          {saving ? 'Saving...' : 'Save selected 10 fixtures'}
        </button>
      </div>

      {availableMatches.length === 0 && (
        <div className="empty-state">
          Load fixtures first. For a season replay, upload the CSV and load a gameweek above.
        </div>
      )}

      {availableMatches.length > 0 && (
        <div className="builder-list">
          {availableMatches.map((match) => {
            const id = String(match.id)
            const selected = selectedIds.includes(id)

            return (
              <button
                type="button"
                key={id}
                className={`builder-fixture ${selected ? 'selected' : ''}`}
                onClick={() => toggleFixture(id)}
              >
                <span>
                  <strong>{match.homeTeam?.name || 'Home team TBC'}</strong> vs{' '}
                  <strong>{match.awayTeam?.name || 'Away team TBC'}</strong>
                </span>
                <small>{formatKickoff(match.utcDate)}</small>
              </button>
            )
          })}
        </div>
      )}

      {message && <p className="success-box">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
