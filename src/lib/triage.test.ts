import { describe, expect, it } from 'vitest'
import { classify, findDuplicates, similarity, suggest } from './triage'

describe('classify (AC1)', () => {
  const cases: [string, string][] = [
    ['Our website is down and nobody can see it', 'outage'],
    ['The site is not loading since this morning', 'outage'],
    ['Emails to our domain are bouncing back', 'dns_email'],
    ['SSL certificate expired, browser says not secure', 'dns_email'],
    ['The contact form is broken and will not submit', 'bug'],
    ['Please change the phone number in the footer', 'content'],
    ['There is a typo on the about page', 'content'],
    ['We want to rank better on Google for roofing keywords', 'seo'],
    ['We would like to add a new page for our team', 'feature'],
    ['Thanks for the great work last month', 'other'],
  ]
  for (const [text, type] of cases) it(`"${text}" is ${type}`, () => expect(classify(text)).toBe(type))
})

describe('suggest (AC2, AC3)', () => {
  it('uses the base priority for each type', () => {
    expect(suggest('The site is down', 'standard').priority).toBe(1)
    expect(suggest('Emails are bouncing', 'standard').priority).toBe(2)
    expect(suggest('Change the phone number', 'standard').priority).toBe(3)
    expect(suggest('Improve our Google ranking', 'standard').priority).toBe(4)
  })
  it('bumps once for urgent wording, lost business and premium', () => {
    expect(suggest('Change the phone number asap', 'standard').priority).toBe(2)
    expect(suggest('Change the phone number asap', 'premium').priority).toBe(1)
    expect(suggest('The contact form is broken and customers cannot order', 'standard').priority).toBe(1)
    expect(suggest('Change the phone number urgent!! asap immediately', 'standard').priority).toBe(2) // one bump, not one per word
  })
  it('never goes above P1', () => {
    const s = suggest('Site is down asap, losing sales', 'premium')
    expect(s.priority).toBe(1)
    expect(s.reasons.some((r) => r.includes('already P1'))).toBe(true)
  })
  it('always explains itself', () => {
    const s = suggest('Please update our opening hours', 'premium')
    expect(s.reasons.length).toBeGreaterThanOrEqual(2)
    expect(s.reasons[0]).toMatch(/content edit/)
    expect(s.slaHours).toBe(4)
  })
})

describe('duplicates (AC8)', () => {
  const open = { client: 'Maple Dental', title: 'Emails bouncing', message: 'Emails sent to our domain bounce back', status: 'new' }
  it('scores similar text high and different text low', () => {
    expect(similarity('emails bouncing domain', 'domain emails bouncing')).toBe(1)
    expect(similarity('change phone number', 'seo keywords ranking')).toBe(0)
    expect(similarity('', 'anything')).toBe(0)
  })
  it('finds a duplicate for the same client only', () => {
    const cand = { client: 'maple dental ', title: 'Email bounce', message: 'Emails to our domain are bouncing back' }
    expect(findDuplicates(cand, [open])).toHaveLength(1)
    expect(findDuplicates({ ...cand, client: 'Other Client' }, [open])).toHaveLength(0)
  })
  it('ignores done requests and unrelated requests', () => {
    const cand = { client: 'Maple Dental', title: 'Emails bouncing', message: 'Emails sent to our domain bounce back' }
    expect(findDuplicates(cand, [{ ...open, status: 'done' }])).toHaveLength(0)
    expect(findDuplicates({ ...cand, title: 'New logo', message: 'Please swap the logo in the header' }, [open])).toHaveLength(0)
  })
})
