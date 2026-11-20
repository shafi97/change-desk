import type { Priority, RequestType, Tier } from './types'

export const SLA_HOURS: Record<Priority, number> = { 1: 2, 2: 4, 3: 8, 4: 24 }

const BASE: Record<RequestType, Priority> = { outage: 1, dns_email: 2, bug: 2, content: 3, other: 3, seo: 4, feature: 4 }

const TYPE_LABEL: Record<RequestType, string> = {
  outage: 'site outage', dns_email: 'domain or email problem', bug: 'bug', content: 'content edit', seo: 'SEO request', feature: 'new feature', other: 'general request',
}

const RULES: { type: RequestType; re: RegExp }[] = [
  { type: 'outage', re: /\b(site|website|page)\b[^.!?\n]{0,40}\b(is |are |was )?(down|offline|not loading|won'?t load|can'?t load|crash(ed|ing)?|white screen|500 error|503)\b|\b(down|offline)\b[^.!?\n]{0,20}\b(site|website)\b|\bnot (loading|working at all)\b/i },
  { type: 'dns_email', re: /\b(dns|domain|nameserver|name server|mx record|spf|dkim|dmarc|ssl|certificate|https warning|not secure)\b|\b(emails?|mail)\b[^.!?\n]{0,40}\b(bounc\w*|not (working|arriving|coming|delivering)|stopped|missing|spam)\b/i },
  { type: 'bug', re: /\b(broken|bug|error|not working|doesn'?t work|isn'?t working|won'?t (submit|save|open)|glitch|wrong|fails?|failing|stuck)\b/i },
  { type: 'feature', re: /\b(new (page|feature|form|section|menu|tab)|add (a )?(page|form|section|booking|shop|blog|popup|chat)|redesign|integrat\w+|build|set ?up)\b/i },
  { type: 'content', re: /\b(change|update|edit|replace|fix|correct|swap|remove|add)\b[^.!?\n]{0,50}\b(text|wording|typo|phone|number|address|hours|opening hours|photo|image|banner|price|prices|menu|team|name|paragraph|copy|logo)\b|\btypo\b/i },
  { type: 'seo', re: /\b(seo|google|ranking|rank|keywords?|meta (title|description)|sitemap|search console|backlinks?|analytics)\b/i },
]

const URGENT = /\b(asap|urgent(ly)?|immediately|right now|emergency|today|as soon as possible)\b|!{2,}/i
const LOST_BUSINESS = /\b(lost (sales|orders|customers|business)|losing (sales|orders|customers|money)|customers (can'?t|cannot|are unable)|can'?t (order|book|buy|pay|check ?out)|cannot (order|book|buy|pay|check ?out))\b/i

export interface Suggestion {
  type: RequestType
  priority: Priority
  slaHours: number
  reasons: string[]
}

export function classify(text: string): RequestType {
  for (const rule of RULES) if (rule.re.test(text)) return rule.type
  return 'other'
}

export function suggest(text: string, tier: Tier): Suggestion {
  const type = classify(text)
  let priority: number = BASE[type]
  const reasons = [`Looks like a ${TYPE_LABEL[type]}, which starts at P${BASE[type]}`]
  const bump = (why: string) => {
    if (priority > 1) {
      priority -= 1
      reasons.push(`${why}, so priority goes up to P${priority}`)
    } else {
      reasons.push(`${why} (already P1)`)
    }
  }
  if (URGENT.test(text)) bump('Urgent wording in the message')
  if (LOST_BUSINESS.test(text)) bump('The client mentions lost business')
  if (tier === 'premium') bump('Premium client')
  const p = priority as Priority
  return { type, priority: p, slaHours: SLA_HOURS[p], reasons }
}

const STOP = new Set('a an and are as at be but by can could for from have has i if in is it its me my of on or our please so that the their there this to us we with you your was were will would'.split(' '))

/** Very light stemming so "bounce", "bounced" and "bouncing" count as the same word. */
function stem(w: string): string {
  return w.length > 4 ? w.replace(/(ing|ed|es|s|e)$/, '') : w
}

export function tokens(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map(stem),
  )
}

export function similarity(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const w of ta) if (tb.has(w)) shared += 1
  return shared / (ta.size + tb.size - shared)
}

export const DUPLICATE_THRESHOLD = 0.5

export function findDuplicates<T extends { client: string; title: string; message: string; status: string }>(
  candidate: { client: string; title: string; message: string },
  existing: T[],
): T[] {
  const text = `${candidate.title} ${candidate.message}`
  return existing.filter(
    (r) => r.status !== 'done' && r.client.trim().toLowerCase() === candidate.client.trim().toLowerCase() && similarity(text, `${r.title} ${r.message}`) >= DUPLICATE_THRESHOLD,
  )
}
