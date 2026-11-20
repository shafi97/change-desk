import { Link, useNavigate, useParams } from 'react-router-dom'
import { PriorityBadge, SlaBadge, formatDue } from '../components/Badges'
import { slaState } from '../lib/requests'
import { STATUSES, type Priority, type Status } from '../lib/types'
import { useRequests } from '../store'

const STATUS_LABEL: Record<Status, string> = { new: 'New', in_progress: 'In progress', waiting: 'Waiting on client', done: 'Done' }

export function Detail() {
  const { id } = useParams()
  const { requests, dispatch, now } = useRequests()
  const navigate = useNavigate()
  const r = requests.find((x) => x.id === id)
  if (!r) return <section><h1>Request not found</h1><Link to="/">Back to the queue</Link></section>
  const s = slaState(r, now)

  return (
    <section>
      <h1>{r.title}</h1>
      <div className="card">
        <p className="muted">{r.client}{r.site ? ` · ${r.site}` : ''} · {r.tier} client · received {formatDue(r.receivedAt)}</p>
        <p>{r.message}</p>
        <p><PriorityBadge priority={r.priority} /> <SlaBadge state={s.state} percent={s.usedPercent} /> {r.status !== 'done' && <>Due {formatDue(r.dueAt)}</>}</p>
        <label className="inline">Status
          <select value={r.status} onChange={(e) => dispatch({ type: 'setStatus', id: r.id, status: e.target.value as Status, now: new Date().toISOString() })}>
            {STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
          </select>
        </label>
        <label className="inline">Priority
          <select value={r.priority} onChange={(e) => dispatch({ type: 'setPriority', id: r.id, priority: Number(e.target.value) as Priority })}>
            {[1, 2, 3, 4].map((p) => <option key={p} value={p}>P{p}</option>)}
          </select>
        </label>
        <button className="danger" onClick={() => { dispatch({ type: 'remove', id: r.id }); navigate('/') }}>Delete</button>
      </div>
    </section>
  )
}
