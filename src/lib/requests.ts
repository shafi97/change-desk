import { addBusinessHours, businessMinutesBetween } from './sla'
import { SLA_HOURS, suggest } from './triage'
import type { ChangeRequest, Priority, RequestType, Status, Tier } from './types'

export type SlaState = 'on_track' | 'at_risk' | 'breached' | 'met' | 'missed'

/**
 * The SLA module works on wall-clock time in UTC fields. These two helpers shift a real moment
 * so its UTC fields show the viewer's local clock (and back), so "9 to 17" means local 9 to 17.
 */
const toWall = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
const fromWall = (w: Date) => new Date(w.getTime() + new Date(w.getTime()).getTimezoneOffset() * 60_000)

export function dueAt(received: Date, priority: Priority): Date {
  return fromWall(addBusinessHours(toWall(received), SLA_HOURS[priority]))
}

export function businessMinutes(from: Date, to: Date): number {
  return businessMinutesBetween(toWall(from), toWall(to))
}

export function slaState(r: ChangeRequest, now: Date): { state: SlaState; usedPercent: number } {
  const total = SLA_HOURS[r.priority] * 60
  const received = new Date(r.receivedAt)
  if (r.status === 'done' && r.completedAt) {
    const used = businessMinutes(received, new Date(r.completedAt))
    return { state: used <= total ? 'met' : 'missed', usedPercent: Math.round((used / total) * 100) }
  }
  const used = businessMinutes(received, now)
  const usedPercent = Math.round((used / total) * 100)
  if (used >= total) return { state: 'breached', usedPercent }
  if (used >= total * 0.75) return { state: 'at_risk', usedPercent }
  return { state: 'on_track', usedPercent }
}

export function sortQueue(list: ChangeRequest[]): ChangeRequest[] {
  return [...list].sort((a, b) => {
    if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1
    if (a.status === 'done') return (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
    return a.dueAt.localeCompare(b.dueAt)
  })
}

export interface NewRequestInput {
  client: string
  tier: Tier
  site: string
  title: string
  message: string
}

export type FormErrors = Partial<Record<keyof NewRequestInput, string>>

export function validate(input: NewRequestInput): FormErrors {
  const e: FormErrors = {}
  if (!input.client.trim()) e.client = 'Enter the client name.'
  if (!input.title.trim()) e.title = 'Enter a short title.'
  if (input.message.trim().length < 10) e.message = 'Paste the client message (at least 10 characters).'
  return e
}

export function buildRequest(
  input: NewRequestInput,
  now: Date,
  override: { type?: RequestType; priority?: Priority } = {},
): ChangeRequest {
  const s = suggest(`${input.title}. ${input.message}`, input.tier)
  const priority = override.priority ?? s.priority
  return {
    id: crypto.randomUUID(),
    client: input.client.trim(),
    tier: input.tier,
    site: input.site.trim(),
    title: input.title.trim(),
    message: input.message.trim(),
    type: override.type ?? s.type,
    priority,
    receivedAt: now.toISOString(),
    dueAt: dueAt(now, priority).toISOString(),
    status: 'new',
  }
}

export type Action =
  | { type: 'add'; request: ChangeRequest }
  | { type: 'setStatus'; id: string; status: Status; now: string }
  | { type: 'setPriority'; id: string; priority: Priority }
  | { type: 'remove'; id: string }
  | { type: 'replaceAll'; requests: ChangeRequest[] }

export function reducer(state: ChangeRequest[], a: Action): ChangeRequest[] {
  switch (a.type) {
    case 'add': return [a.request, ...state]
    case 'setStatus':
      return state.map((r) => r.id !== a.id ? r : { ...r, status: a.status, completedAt: a.status === 'done' ? a.now : undefined })
    case 'setPriority':
      return state.map((r) => r.id !== a.id ? r : { ...r, priority: a.priority, dueAt: dueAt(new Date(r.receivedAt), a.priority).toISOString() })
    case 'remove': return state.filter((r) => r.id !== a.id)
    case 'replaceAll': return a.requests
    default: return state
  }
}

export function counts(list: ChangeRequest[], now: Date) {
  let open = 0, atRisk = 0, breached = 0
  for (const r of list) {
    if (r.status === 'done') continue
    open += 1
    const { state } = slaState(r, now)
    if (state === 'at_risk') atRisk += 1
    if (state === 'breached') breached += 1
  }
  return { open, atRisk, breached }
}

/** Demo data, dated relative to now so the states are visible. */
export function sampleRequests(now: Date): ChangeRequest[] {
  const mk = (hoursAgo: number, input: NewRequestInput, status: Status = 'new') => {
    const received = new Date(now.getTime() - hoursAgo * 3_600_000)
    const r = buildRequest(input, received)
    return { ...r, status, id: crypto.randomUUID() }
  }
  return [
    mk(1.2, { client: 'Prairie Fresh Bakery', tier: 'premium', site: 'prairiefresh.example', title: 'Site is down', message: 'Our website is down and customers cannot order for the holiday weekend!! Please fix asap' }),
    mk(5, { client: 'Maple Dental', tier: 'standard', site: 'mapledental.example', title: 'Emails bouncing', message: 'Emails sent to our domain are bouncing back since yesterday, the front desk is not getting booking requests.' }, 'in_progress'),
    mk(9, { client: 'Northside Cabinets', tier: 'standard', site: 'northsidecabinets.example', title: 'Update opening hours', message: 'Can you change our opening hours on the contact page to 8 to 5 on weekdays? Thanks.' }),
    mk(20, { client: 'Lakeview Fitness', tier: 'standard', site: 'lakeviewfitness.example', title: 'Add a class booking page', message: 'We would like to add a new page with class booking and a schedule table when you have time.' }, 'waiting'),
  ]
}
