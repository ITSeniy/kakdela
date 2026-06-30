import type { DmListResponse, DmOpenResponse, DmSummary } from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'

export async function listDms(): Promise<DmSummary[]> {
  const res = await apiFetch<DmListResponse>('/api/dm')
  return res.dms
}

export async function openDmWithUser(userId: string): Promise<DmOpenResponse> {
  return apiFetch<DmOpenResponse>(`/api/dm/with/${userId}`, { method: 'POST' })
}

export async function markDmRead(channelId: string, messageId: string): Promise<void> {
  await apiFetch<void>(`/api/dm/${channelId}/read`, {
    method: 'POST',
    body: JSON.stringify({ messageId }),
  })
}

/** «Закрыть переписку» — скрыть из своего списка до следующего сообщения. */
export async function hideDm(channelId: string): Promise<void> {
  await apiFetch<void>(`/api/dm/${channelId}/hide`, { method: 'POST' })
}
