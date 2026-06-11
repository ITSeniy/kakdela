import type { SearchResponse, SearchSort } from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'

export interface SearchMessagesOpts {
  q: string
  channelId?: string
  authorId?: string
  before?: string
  after?: string
  limit?: number
  sort?: SearchSort
}

export async function searchMessages(opts: SearchMessagesOpts): Promise<SearchResponse> {
  const params = new URLSearchParams()
  params.set('q', opts.q)
  if (opts.channelId) params.set('channelId', opts.channelId)
  if (opts.authorId)  params.set('authorId',  opts.authorId)
  if (opts.before)    params.set('before',    opts.before)
  if (opts.after)     params.set('after',     opts.after)
  if (opts.limit !== undefined) params.set('limit', String(opts.limit))
  if (opts.sort)      params.set('sort',      opts.sort)
  return apiFetch<SearchResponse>(`/api/search/messages?${params.toString()}`)
}
