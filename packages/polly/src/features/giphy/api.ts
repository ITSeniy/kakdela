import type { GiphyConfig, GiphyResponse } from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'

export async function getGiphyConfig(): Promise<GiphyConfig> {
  return apiFetch<GiphyConfig>('/api/giphy/config')
}

export async function giphyTrending(opts: { offset?: number; limit?: number } = {}): Promise<GiphyResponse> {
  const p = new URLSearchParams()
  if (opts.offset) p.set('offset', String(opts.offset))
  if (opts.limit) p.set('limit', String(opts.limit))
  const qs = p.toString()
  return apiFetch<GiphyResponse>(`/api/giphy/trending${qs ? '?' + qs : ''}`)
}

export async function giphySearch(q: string, opts: { offset?: number; limit?: number } = {}): Promise<GiphyResponse> {
  const p = new URLSearchParams({ q })
  if (opts.offset) p.set('offset', String(opts.offset))
  if (opts.limit) p.set('limit', String(opts.limit))
  return apiFetch<GiphyResponse>(`/api/giphy/search?${p.toString()}`)
}
