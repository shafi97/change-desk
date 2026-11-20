import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PriorityBadge, SlaBadge, formatDue } from '../components/Badges'
import { counts, sampleRequests, slaState, sortQueue } from '../lib/requests'
import { STATUSES, type Status } from '../lib/types'
import { useRequests } from '../store'

const STATUS_LABEL: Record<Status, string> = { new: 'New', in_progress: 'In progress', waiting: 'Waiting on client', done: 'Done' }

export function Queue() {
  const { requests, dispatch, now } = useRequests()
  const [filter, setFilter] = useState<Status | 'open' | 'all'>('open')
  const c = counts(requests, now)
  const sorted = sortQueue(requests).filter((r) => (filter === 'all' ? true : filter === 'open' ? r.status !== 'done' : r.status === filter))

  return (
    <section>
      <h1>Queue</h1>
      <div className="stats">
        <div className="card stat"><span>Open</span><strong data-testid="open">{c.open}</strong></div>
        <div className="card stat"><span>At risk</span><strong data-testid="at-risk">{c.atRisk}</strong></div>
        <div className="card stat"><span>Breached</span><strong data-testid="breached">{c.breached}</strong></div>
      </div>

      <label className="inline">
        Show
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="open">Open requests</option>
          <option value="all">Everything</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </label>

      {sorted.length === 0 ? (
        <div className="card">
          <p>No requests to show.</p>
          <Link to="/new">Add a request</Link>
          {requests.length === 0 && <> or <button onClick={() => dispatch({ type: 'replaceAll', requests: sampleRequests(new Date()) })}>Load sample requests</button></>}
        </div>
      ) : (
        <ul className="list">
          {sorted.map((r) => {
            const s = slaState(r, now)
            return (
              <li key={r.id} className={`card row sla-row-${s.state}`}>
                <div>
                  <Link to={`/requests/${r.id}`}><strong>{r.title}</strong></Link>
                  <div className="muted">{r.client} · {STATUS_LABEL[r.status]}</div>
                </div>
                <div className="right">
                  <PriorityBadge priority={r.priority} /> <SlaBadge state={s.state} percent={s.usedPercent} />
                  <div className="muted">{r.status === 'done' ? 'Done' : `Due ${formatDue(r.dueAt)}`}</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
