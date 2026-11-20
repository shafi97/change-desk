import { describe, expect, it } from 'vitest'
import { buildRequest, counts, dueAt, reducer, slaState, sortQueue, validate } from './requests'
import type { ChangeRequest } from './types'

// Dates are built in local time so these tests pass in any time zone. 2026-11-16 is a Monday.
const local = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m)
const input = { client: 'Acme', tier: 'standard' as const, site: '', title: 'Change phone', message: 'Please change the phone number in the footer.' }

describe('dueAt (AC4)', () => {
  it('adds the SLA in business hours within a day (P3 is 8h)', () => {
    expect(dueAt(local(16, 9), 3).getTime()).toBe(local(16, 17).getTime())
  })
  it('skips the night and the weekend', () => {
    expect(dueAt(local(20, 16), 1).getTime()).toBe(local(23, 10).getTime()) // P1 is 2h: Friday 16:00 + 2h = Monday 10:00
  })
  it('uses the SLA for each priority', () => {
    expect(dueAt(local(16, 9), 1).getTime()).toBe(local(16, 11).getTime())
    expect(dueAt(local(16, 9), 4).getTime()).toBe(local(18, 17).getTime()) // 24 business hours = three full working days, ending Wednesday at closing
  })
})

describe('slaState (AC5)', () => {
  const base = buildRequest(input, local(16, 9), { priority: 3 }) // 8h SLA
  it('on track under 75%', () => expect(slaState(base, local(16, 14, 30)).state).toBe('on_track'))
  it('at risk from 75%', () => expect(slaState(base, local(16, 15)).state).toBe('at_risk'))
  it('breached at 100%', () => {
    expect(slaState(base, local(16, 17)).state).toBe('breached')
    expect(slaState(base, local(17, 12)).state).toBe('breached')
  })
  it('does not count nights or weekends', () => {
    const friday = buildRequest(input, local(20, 16), { priority: 3 })
    expect(slaState(friday, local(22, 12)).usedPercent).toBe(13) // 1h of 8h used by Saturday
  })
  it('shows met or missed for done requests', () => {
    const done: ChangeRequest = { ...base, status: 'done', completedAt: local(16, 12).toISOString() }
    expect(slaState(done, local(30, 12)).state).toBe('met')
    expect(slaState({ ...done, completedAt: local(17, 12).toISOString() }, local(30, 12)).state).toBe('missed')
  })
})

describe('queue and counts (AC6)', () => {
  const a = buildRequest({ ...input, title: 'A' }, local(16, 9), { priority: 4 })
  const b = buildRequest({ ...input, title: 'B' }, local(16, 9), { priority: 1 })
  const c = { ...buildRequest({ ...input, title: 'C' }, local(16, 9), { priority: 1 }), status: 'done' as const, completedAt: local(16, 10).toISOString() }
  it('sorts by due time and puts done last', () => {
    expect(sortQueue([a, c, b]).map((r) => r.title)).toEqual(['B', 'A', 'C'])
  })
  it('counts open, at risk and breached', () => {
    expect(counts([a, b, c], local(16, 10, 30))).toEqual({ open: 2, atRisk: 1, breached: 0 })
    expect(counts([a, b, c], local(16, 12))).toEqual({ open: 2, atRisk: 0, breached: 1 })
  })
})

describe('validate (AC7)', () => {
  it('requires client, title and a real message', () => {
    expect(Object.keys(validate({ ...input, client: '', title: '', message: 'short' })).sort()).toEqual(['client', 'message', 'title'])
    expect(validate(input)).toEqual({})
  })
})

describe('reducer', () => {
  const r = buildRequest(input, local(16, 9))
  it('sets completedAt only when done', () => {
    const done = reducer([r], { type: 'setStatus', id: r.id, status: 'done', now: 'T' })
    expect(done[0].completedAt).toBe('T')
    expect(reducer(done, { type: 'setStatus', id: r.id, status: 'in_progress', now: 'T2' })[0].completedAt).toBeUndefined()
  })
  it('recomputes the due time when priority changes', () => {
    const changed = reducer([r], { type: 'setPriority', id: r.id, priority: 1 })
    expect(new Date(changed[0].dueAt).getTime()).toBe(local(16, 11).getTime())
  })
  it('removes', () => expect(reducer([r], { type: 'remove', id: r.id })).toEqual([]))
})
