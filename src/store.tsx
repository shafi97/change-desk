import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react'
import { reducer, type Action } from './lib/requests'
import type { ChangeRequest } from './lib/types'

const KEY = 'changedesk.requests.v1'

function load(): ChangeRequest[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ChangeRequest[]) : []
  } catch {
    return []
  }
}

interface Ctx { requests: ChangeRequest[]; dispatch: (a: Action) => void; now: Date }
const RequestsContext = createContext<Ctx | null>(null)

export function RequestsProvider({ children, initial, clock }: { children: ReactNode; initial?: ChangeRequest[]; clock?: () => Date }) {
  const [requests, dispatch] = useReducer(reducer, initial ?? [], (s) => (s.length ? s : load()))
  const read = clock ?? (() => new Date())
  const [now, setNow] = useState(read)

  useEffect(() => {
    const t = setInterval(() => setNow(read()), 60_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(requests)) } catch { /* storage unavailable */ }
  }, [requests])

  return <RequestsContext.Provider value={{ requests, dispatch, now }}>{children}</RequestsContext.Provider>
}

export function useRequests(): Ctx {
  const ctx = useContext(RequestsContext)
  if (!ctx) throw new Error('useRequests must be used inside RequestsProvider')
  return ctx
}
