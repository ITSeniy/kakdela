import type { InboxMentionsResponse } from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'

export interface ListInboxOpts {
  before?: string
  limit?: number
  unreadOnly?: boolean
}

export async function listInboxMentions(opts: ListInboxOpts = {}): Promise<InboxMentionsResponse> {
  const params = new URLSearchParams()
  if (opts.before) params.set('before', opts.before)
  if (opts.limit !== undefined) params.set('limit', String(opts.limit))
  if (opts.unreadOnly) params.set('unreadOnly', 'true')
  const qs = params.toString()
  return apiFetch<InboxMentionsResponse>(`/api/inbox/mentions${qs ? '?' + qs : ''}`)
}

export async function markMentionsRead(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return
  await apiFetch<void>('/api/inbox/mentions/read', {
    method: 'POST',
    body: JSON.stringify({ messageIds }),
  })
}
