import { useState } from 'react'

export default function LeagueTable() {
  const [rows, setRows] = useState([])
  const [league, setLeague] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadTable() {
    setLoading(true)
    setError('')
    setSelectedDetail(null)

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

  function showMatches(row, resultType) {
    const matches = (row.matches || []).filter((match) => match.result === resultType)

    setSelectedDetail({
      teamName: row.teamName,
      resultType,
      matches,
    })
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
                  <td>
                    <button
                      type="button"
                      className="stat-link"
                      onClick={() => showMatches(row, 'win')}
                      disabled={row.won === 0}
                    >
                      {row.won}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="stat-link"
                      onClick={() => showMatches(row, 'draw')}
                      disabled={row.drawn === 0}
                    >
                      {row.drawn}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="stat-link"
                      onClick={() => showMatches(row, 'loss')}
                      disabled={row.lost === 0}
                    >
                      {row.lost}
                    </button>
                  </td>
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

      {selectedDetail && (
        <MatchDetailPanel detail={selectedDetail} onClose={() => setSelectedDetail(null)} />
      )}

      {error && <p className="error">{error}</p>}
    </section>
  )
}

function MatchDetailPanel({ detail, onClose }) {
  const resultLabel = detail.resultType === 'win' ? 'wins' : detail.resultType === 'loss' ? 'losses' : 'draws'

  return (
    <div className="match-detail-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow small">Match details</p>
          <h2>{detail.teamName} {resultLabel}</h2>
        </div>
        <button type="button" className="secondary-button" onClick={onClose}>Close</button>
      </div>

      {detail.matches.length === 0 && (
        <div className="empty-state">No matching results yet.</div>
      )}

      {detail.matches.map((match) => (
        <article className="match-detail-card" key={match.matchId}>
          <div className="match-scoreline">
            <span>GW {match.gameweekNumber || '?'}</span>
            <strong>
              {match.headToHead.homeTeam} {match.headToHead.homeScore} - {match.headToHead.awayScore} {match.headToHead.awayTeam}
            </strong>
            <span>{match.playerTeam} {match.result}</span>
          </div>

          <div className="pick-breakdown-grid">
            <PickBreakdown title={`${match.headToHead.homeTeam} choices`} picks={match.homePicks} />
            <PickBreakdown title={`${match.headToHead.awayTeam} choices`} picks={match.awayPicks} />
          </div>
        </article>
      ))}
    </div>
  )
}

function PickBreakdown({ title, picks }) {
  return (
    <div className="pick-breakdown">
      <h3>{title}</h3>
      {picks.length === 0 && <p className="muted-text">No picks found.</p>}
      {picks.map((pick) => (
        <div className="pick-result-row" key={pick.pickId}>
          <strong>{pick.selectedTeamName}</strong>
          <span>
            {pick.fixture.homeTeamName} {pick.fixture.homeScore ?? '-'} - {pick.fixture.awayScore ?? '-'} {pick.fixture.awayTeamName}
          </span>
          <span>
            GF {pick.goalsFor} / GA {pick.goalsAgainst} / GD {pick.goalDifference > 0 ? `+${pick.goalDifference}` : pick.goalDifference}
          </span>
        </div>
      ))}
    </div>
  )
}
