import type {
  VoiceJoinResponse,
  VoiceModerateRequest,
  VoiceParticipantsResponse,
} from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'

export async function joinVoiceChannel(channelId: string): Promise<VoiceJoinResponse> {
  return apiFetch<VoiceJoinResponse>(`/api/voice/${channelId}/join`, { method: 'POST' })
}

export async function leaveVoiceChannel(channelId: string): Promise<void> {
  await apiFetch<void>(`/api/voice/${channelId}/leave`, { method: 'POST' })
}

export async function listVoiceParticipants(
  channelId: string,
): Promise<VoiceParticipantsResponse> {
  return apiFetch<VoiceParticipantsResponse>(`/api/voice/${channelId}/participants`)
}

/** Админская модерация участника ГС: mute/deafen/kick/move. */
export async function moderateVoice(
  channelId: string,
  body: VoiceModerateRequest,
): Promise<void> {
  await apiFetch<void>(`/api/voice/${channelId}/moderate`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
