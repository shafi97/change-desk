import type { SlaState } from '../lib/requests'
import type { Priority } from '../lib/types'

const SLA_TEXT: Record<SlaState, string> = { on_track: 'On track', at_risk: 'At risk', breached: 'Breached', met: 'Met', missed: 'Missed' }

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`badge p${priority}`}>P{priority}</span>
}

export function SlaBadge({ state, percent }: { state: SlaState; percent: number }) {
  return <span className={`badge sla-${state}`}>{SLA_TEXT[state]} ({percent}%)</span>
}

export function formatDue(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
