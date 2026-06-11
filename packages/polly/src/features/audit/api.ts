import type { AuditEntriesResponse } from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'

export async function listAuditEntries(
  serverId: string,
  opts?: { before?: string; limit?: number },
): Promise<AuditEntriesResponse> {
  const params = new URLSearchParams()
  if (opts?.before) params.set('before', opts.before)
  if (opts?.limit !== undefined) params.set('limit', String(opts.limit))
  const qs = params.toString()
  return apiFetch<AuditEntriesResponse>(
    `/api/servers/${serverId}/audit${qs ? '?' + qs : ''}`,
  )
}
