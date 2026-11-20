export interface BusinessConfig {
  workStart?: number
  workEnd?: number
  workDays?: number[]
  holidays?: string[]
}

interface Resolved {
  startMin: number
  endMin: number
  days: Set<number>
  holidays: Set<string>
}

const DAY_MS = 86_400_000
const MAX_STEPS = 100_000

function resolve(config: BusinessConfig): Resolved {
  const workStart = config.workStart ?? 9
  const workEnd = config.workEnd ?? 17
  const workDays = config.workDays ?? [1, 2, 3, 4, 5]
  const holidays = config.holidays ?? []
  if (!(workStart >= 0 && workEnd <= 24 && workEnd > workStart)) {
    throw new RangeError('workEnd must be after workStart, within 0 to 24')
  }
  if (workDays.length === 0 || workDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new RangeError('workDays must be a non-empty list of 0 to 6')
  }
  for (const h of holidays) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(h)) throw new RangeError(`bad holiday date: ${h}`)
  }
  return { startMin: workStart * 60, endMin: workEnd * 60, days: new Set(workDays), holidays: new Set(holidays) }
}

function assertDate(d: Date, name: string) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) throw new TypeError(`${name} must be a valid Date`)
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const minutesIntoDay = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 + d.getUTCMilliseconds() / 60_000
const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
const isWorkingDay = (d: Date, r: Resolved) => r.days.has(d.getUTCDay()) && !r.holidays.has(iso(d))
const atMinute = (day: Date, minute: number) => new Date(day.getTime() + minute * 60_000)

/** Moves a moment forward to the next moment that falls inside working time. */
function normalize(date: Date, r: Resolved): Date {
  let cursor = new Date(date.getTime())
  for (let i = 0; i < MAX_STEPS; i += 1) {
    const day = startOfDay(cursor)
    if (!isWorkingDay(day, r)) {
      cursor = atMinute(new Date(day.getTime() + DAY_MS), r.startMin)
      continue
    }
    const m = minutesIntoDay(cursor)
    if (m < r.startMin) return atMinute(day, r.startMin)
    if (m >= r.endMin) {
      cursor = atMinute(new Date(day.getTime() + DAY_MS), r.startMin)
      continue
    }
    return cursor
  }
  throw new RangeError('No working time found. Check the config.')
}

export function addBusinessHours(start: Date, hours: number, config: BusinessConfig = {}): Date {
  assertDate(start, 'start')
  if (typeof hours !== 'number' || !Number.isFinite(hours) || hours < 0) throw new RangeError('hours must be a finite number, 0 or more')
  const r = resolve(config)
  let cursor = normalize(start, r)
  let remaining = Math.round(hours * 60 * 1000) / 1000 // minutes
  for (let i = 0; i < MAX_STEPS && remaining > 0; i += 1) {
    const day = startOfDay(cursor)
    const room = r.endMin - minutesIntoDay(cursor)
    if (remaining <= room) return new Date(cursor.getTime() + remaining * 60_000)
    remaining -= room
    cursor = normalize(atMinute(new Date(day.getTime() + DAY_MS), r.startMin), r)
  }
  return cursor
}

export function businessMinutesBetween(from: Date, to: Date, config: BusinessConfig = {}): number {
  assertDate(from, 'from')
  assertDate(to, 'to')
  const r = resolve(config)
  if (to.getTime() <= from.getTime()) return 0
  let total = 0
  let cursor = normalize(from, r)
  for (let i = 0; i < MAX_STEPS && cursor.getTime() < to.getTime(); i += 1) {
    const day = startOfDay(cursor)
    const dayEnd = atMinute(day, r.endMin)
    const stop = to.getTime() < dayEnd.getTime() ? to : dayEnd
    total += (stop.getTime() - cursor.getTime()) / 60_000
    cursor = normalize(atMinute(new Date(day.getTime() + DAY_MS), r.startMin), r)
  }
  return Math.round(total * 1000) / 1000
}
