import { useState } from 'react'

export default function LeagueTable() {
  const [rows, setRows] = useState([])
  const [league, setLeague] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadTable() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/.netlify/functions/getLeagueTable')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Could not load league table')
      }

      setLeague(data.league)
      setRows(data.table || [])
    } catch (err) {
      setError(err.message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="table-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow small">League table</p>
          <h2>{league ? `${league.name} ${league.season_name}` : 'Standings'}</h2>
        </div>
        <button type="button" onClick={loadTable} disabled={loading}>
          {loading ? 'Loading...' : 'Load table'}
        </button>
      </div>

      {rows.length === 0 && !error && (
        <div className="empty-state">Score a gameweek, then load the table.</div>
      )}

      {rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>SF</th>
                <th>SA</th>
                <th>SD</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId}>
                  <td>{row.position}</td>
                  <td>{row.teamName}</td>
                  <td>{row.played}</td>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td>{row.scoreFor}</td>
                  <td>{row.scoreAgainst}</td>
                  <td>{row.scoreDifference}</td>
                  <td><strong>{row.points}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </section>
  )
}
