import { useMemo, useState } from 'react'
import './LeagueTable.css'

const PAGE_SIZE = 100

export default function LeagueTable() {
  const [rows, setRows] = useState([])
  const [league, setLeague] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageStart = rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * PAGE_SIZE, rows.length)

  const visibleRows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return rows.slice(startIndex, startIndex + PAGE_SIZE)
  }, [rows, currentPage])

  async function loadTable() {
    setLoading(true)
    setError('')
    setSelectedDetail(null)
    setPage(1)

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

  function goToPage(nextPage) {
    const cleanPage = Math.min(Math.max(Number(nextPage) || 1, 1), pageCount)
    setPage(cleanPage)
    setSelectedDetail(null)
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
        <>
          <TablePager
            currentPage={currentPage}
            pageCount={pageCount}
            pageStart={pageStart}
            pageEnd={pageEnd}
            totalRows={rows.length}
            onPageChange={goToPage}
          />

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
                {visibleRows.map((row) => (
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

          <TablePager
            currentPage={currentPage}
            pageCount={pageCount}
            pageStart={pageStart}
            pageEnd={pageEnd}
            totalRows={rows.length}
            onPageChange={goToPage}
          />
        </>
      )}

      {selectedDetail && (
        <MatchDetailPanel detail={selectedDetail} onClose={() => setSelectedDetail(null)} />
      )}

      {error && <p className="error">{error}</p>}
    </section>
  )
}

function TablePager({ currentPage, pageCount, pageStart, pageEnd, totalRows, onPageChange }) {
  return (
    <div className="league-table-pager">
      <span>
        Showing <strong>{pageStart}-{pageEnd}</strong> of <strong>{totalRows}</strong>
      </span>

      <div className="league-table-pager-controls">
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Previous
        </button>

        <label>
          Page
          <input
            type="number"
            min="1"
            max={pageCount}
            value={currentPage}
            onChange={(event) => onPageChange(event.target.value)}
          />
        </label>

        <span>of {pageCount}</span>

        <button
          type="button"
          className="secondary-button compact-button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= pageCount}
        >
          Next
        </button>
      </div>
    </div>
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
