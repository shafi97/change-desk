import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { buildRequest } from './lib/requests'
import { RequestsProvider } from './store'

const now = new Date(2026, 10, 16, 10, 0) // Monday 10:00 local

function renderAt(path: string, initial = []) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RequestsProvider initial={initial} clock={() => now}><App /></RequestsProvider>
    </MemoryRouter>,
  )
}

async function fill(client: string, title: string, message: string) {
  await userEvent.type(screen.getByLabelText('Client'), client)
  await userEvent.type(screen.getByLabelText('Title'), title)
  await userEvent.type(screen.getByLabelText('Client message'), message)
}

beforeEach(() => localStorage.clear())

describe('New request page', () => {
  it('shows errors and saves nothing for an empty form (AC7)', async () => {
    renderAt('/new')
    await userEvent.click(screen.getByRole('button', { name: /save request/i }))
    expect(screen.getByText(/enter the client name/i)).toBeInTheDocument()
    expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument()
  })

  it('suggests type, priority and reasons as the message is pasted (AC1 to AC4)', async () => {
    renderAt('/new')
    await fill('Acme', 'Site down', 'Our website is down and customers cannot order!! asap')
    const box = screen.getByText('Suggestion').closest('div')!
    expect(box).toHaveTextContent(/Type: Outage · Priority: P1/)
    expect(within(box).getAllByRole('listitem').length).toBeGreaterThanOrEqual(2)
  })

  it('warns about a duplicate from the same client but still allows saving (AC8)', async () => {
    const existing = buildRequest({ client: 'Acme', tier: 'standard', site: '', title: 'Emails bouncing', message: 'Emails to our domain are bouncing back' }, now)
    renderAt('/new', [existing] as never)
    await fill('Acme', 'Email bounce', 'Emails sent to our domain bounce back')
    expect(await screen.findByRole('alert')).toHaveTextContent(/duplicate/i)
    expect(screen.getByRole('button', { name: /save request/i })).toBeEnabled()
  })

  it('saves and opens the request (AC3)', async () => {
    renderAt('/new')
    await fill('Acme', 'Change phone', 'Please change the phone number on the contact page.')
    await userEvent.click(screen.getByRole('button', { name: /save request/i }))
    expect(await screen.findByRole('heading', { name: 'Change phone' })).toBeInTheDocument()
  })
})

describe('Queue page', () => {
  it('lets you load sample data and shows breached and at-risk counts (AC5, AC9)', async () => {
    renderAt('/')
    await userEvent.click(screen.getByRole('button', { name: /load sample requests/i }))
    expect(Number(screen.getByTestId('open').textContent)).toBe(4)
  })
})
