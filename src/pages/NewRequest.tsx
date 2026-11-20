import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PriorityBadge, formatDue } from '../components/Badges'
import { buildRequest, dueAt, validate, type FormErrors, type NewRequestInput } from '../lib/requests'
import { findDuplicates, suggest } from '../lib/triage'
import { TYPES, type Priority, type RequestType, type Tier } from '../lib/types'
import { useRequests } from '../store'

const TYPE_LABEL: Record<RequestType, string> = { outage: 'Outage', dns_email: 'Domain or email', bug: 'Bug', content: 'Content edit', seo: 'SEO', feature: 'New feature', other: 'Other' }

export function NewRequest() {
  const { requests, dispatch, now } = useRequests()
  const navigate = useNavigate()
  const [input, setInput] = useState<NewRequestInput>({ client: '', tier: 'standard', site: '', title: '', message: '' })
  const [typeOverride, setTypeOverride] = useState<RequestType | ''>('')
  const [priorityOverride, setPriorityOverride] = useState<'' | `${Priority}`>('')
  const [errors, setErrors] = useState<FormErrors>({})

  const ready = input.message.trim().length >= 10
  const suggestion = useMemo(() => (ready ? suggest(`${input.title}. ${input.message}`, input.tier) : null), [ready, input.title, input.message, input.tier])
  const duplicates = useMemo(() => (ready ? findDuplicates(input, requests) : []), [ready, input, requests])
  const priority = (priorityOverride ? Number(priorityOverride) : suggestion?.priority) as Priority | undefined

  function set<K extends keyof NewRequestInput>(k: K, v: NewRequestInput[K]) {
    setInput((i) => ({ ...i, [k]: v }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const found = validate(input)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    const request = buildRequest(input, now, { type: typeOverride || undefined, priority: priorityOverride ? (Number(priorityOverride) as Priority) : undefined })
    dispatch({ type: 'add', request })
    navigate(`/requests/${request.id}`)
  }

  return (
    <section>
      <h1>New request</h1>
      <form onSubmit={submit} noValidate aria-label="New request" className="card form">
        <label>Client
          <input value={input.client} onChange={(e) => set('client', e.target.value)} aria-invalid={Boolean(errors.client)} />
        </label>
        {errors.client && <p className="error">{errors.client}</p>}

        <label>Client type
          <select value={input.tier} onChange={(e) => set('tier', e.target.value as Tier)}>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </label>

        <label>Website (optional)
          <input value={input.site} onChange={(e) => set('site', e.target.value)} placeholder="example.com" />
        </label>

        <label>Title
          <input value={input.title} onChange={(e) => set('title', e.target.value)} aria-invalid={Boolean(errors.title)} />
        </label>
        {errors.title && <p className="error">{errors.title}</p>}

        <label>Client message
          <textarea rows={5} value={input.message} onChange={(e) => set('message', e.target.value)} aria-invalid={Boolean(errors.message)} placeholder="Paste what the client wrote" />
        </label>
        {errors.message && <p className="error">{errors.message}</p>}

        {duplicates.length > 0 && (
          <div role="alert" className="notice">
            This looks like a duplicate of an open request from {duplicates[0].client}: <strong>{duplicates[0].title}</strong>. You can still save it.
          </div>
        )}

        {suggestion && priority && (
          <div className="card suggestion" aria-live="polite">
            <h2>Suggestion</h2>
            <p>Type: <strong>{TYPE_LABEL[typeOverride || suggestion.type]}</strong> · Priority: <PriorityBadge priority={priority} /> · Due: <strong>{formatDue(dueAt(now, priority).toISOString())}</strong></p>
            <ul>{suggestion.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            <div className="row-inline">
              <label>Change type
                <select value={typeOverride} onChange={(e) => setTypeOverride(e.target.value as RequestType | '')}>
                  <option value="">Use suggestion</option>
                  {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                </select>
              </label>
              <label>Change priority
                <select value={priorityOverride} onChange={(e) => setPriorityOverride(e.target.value as '' | `${Priority}`)}>
                  <option value="">Use suggestion</option>
                  {[1, 2, 3, 4].map((p) => <option key={p} value={p}>P{p}</option>)}
                </select>
              </label>
            </div>
          </div>
        )}

        <button type="submit" className="primary">Save request</button>
      </form>
    </section>
  )
}
