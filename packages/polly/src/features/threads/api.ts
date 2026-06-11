import type {
  Channel,
  CreateThreadRequest,
  CreateThreadResponse,
  ThreadListResponse,
  ThreadSummary,
} from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'

export async function createThread(
  channelId: string,
  messageId: string,
  body: CreateThreadRequest = {},
): Promise<CreateThreadResponse> {
  return apiFetch<CreateThreadResponse>(
    `/api/channels/${channelId}/messages/${messageId}/threads`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export async function listThreads(channelId: string, includeArchived = false): Promise<ThreadSummary[]> {
  const params = new URLSearchParams()
  if (includeArchived) params.set('includeArchived', 'true')
  const qs = params.toString()
  const res = await apiFetch<ThreadListResponse>(
    `/api/channels/${channelId}/threads${qs ? '?' + qs : ''}`,
  )
  return res.threads
}

export async function archiveThread(threadId: string, archived = true): Promise<Channel> {
  return apiFetch<Channel>(`/api/threads/${threadId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ archived }),
  })
}
