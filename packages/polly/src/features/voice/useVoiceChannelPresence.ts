import { useEffect, useMemo } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'

import type { Channel, VoiceParticipantPublic, VoiceParticipantsResponse } from '@kakdela/ginzu/api-types'

import { wsClient } from '../../lib/ws.js'
import { listVoiceParticipants } from './api.js'

/**
 * Возвращает `Map<channelId, VoiceParticipantPublic[]>` для отрисовки
 * участников под voice-каналами в сайдбаре: аватарка, mute/deafen-иконки,
 * LIVE-бейдж стрима.
 *
 * Источники истины:
 * 1. GET /api/voice/:id/participants — изначальный snapshot для каждого канала.
 * 2. WS voice.join / voice.leave — состав; voice.state — mute/стрим;
 *    voice.mod — серверная модерация. Всё патчит queryData.
 *
 * GET /participants кэшируется на сервере 5 секунд (см. T-031), поэтому
 * частые обращения дёшевы. staleTime 30s — react-query не будет рефетчить
 * без нужды; WS заменяет polling.
 */
export function useVoiceChannelPresence(
  channels: Channel[],
): Map<string, VoiceParticipantPublic[]> {
  const queryClient = useQueryClient()
  const voiceChannels = useMemo(
    () => channels.filter((c) => c.kind === 'voice'),
    [channels],
  )

  const queries = useQueries({
    queries: voiceChannels.map((c) => ({
      queryKey: ['voiceParticipants', c.id],
      queryFn: () => listVoiceParticipants(c.id),
      staleTime: 30_000,
    })),
  })

  useEffect(() => {
    return wsClient.on((event) => {
      if (
        event.t !== 'voice.join' && event.t !== 'voice.leave'
        && event.t !== 'voice.state' && event.t !== 'voice.mod'
      ) return
      queryClient.setQueryData<VoiceParticipantsResponse>(
        ['voiceParticipants', event.channelId],
        (old) => {
          const list = old?.participants ?? []
          switch (event.t) {
            case 'voice.join': {
              if (list.some((p) => p.userId === event.userId)) return old
              // displayName ещё не знаем — заполнится при следующем рефетче
              // или через client-side member lookup при отрисовке.
              return {
                participants: [
                  ...list,
                  {
                    userId: event.userId,
                    displayName: '',
                    isScreenSharing: false,
                    isMuted: true,
                    serverMuted: false,
                    serverDeafened: false,
                  },
                ],
              }
            }
            case 'voice.leave':
              return { participants: list.filter((p) => p.userId !== event.userId) }
            case 'voice.state':
              return {
                participants: list.map((p) =>
                  p.userId === event.userId
                    ? { ...p, isMuted: event.muted, isScreenSharing: event.screen }
                    : p,
                ),
              }
            case 'voice.mod':
              return {
                participants: list.map((p) =>
                  p.userId === event.userId
                    ? { ...p, serverMuted: event.muted, serverDeafened: event.deafened }
                    : p,
                ),
              }
          }
        },
      )
    })
  }, [queryClient])

  return useMemo(() => {
    const map = new Map<string, VoiceParticipantPublic[]>()
    for (let i = 0; i < voiceChannels.length; i += 1) {
      const ch = voiceChannels[i]
      const q = queries[i]
      if (!ch) continue
      map.set(ch.id, q?.data?.participants ?? [])
    }
    return map
  }, [voiceChannels, queries])
}
