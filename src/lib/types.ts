export type RequestType = 'outage' | 'dns_email' | 'bug' | 'content' | 'seo' | 'feature' | 'other'
export type Priority = 1 | 2 | 3 | 4
export type Status = 'new' | 'in_progress' | 'waiting' | 'done'
export type Tier = 'standard' | 'premium'

export const STATUSES: Status[] = ['new', 'in_progress', 'waiting', 'done']
export const TYPES: RequestType[] = ['outage', 'dns_email', 'bug', 'content', 'seo', 'feature', 'other']

export interface ChangeRequest {
  id: string
  client: string
  tier: Tier
  site: string
  title: string
  message: string
  type: RequestType
  priority: Priority
  receivedAt: string
  dueAt: string
  status: Status
  completedAt?: string
}
