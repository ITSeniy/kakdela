import { useEffect, useMemo } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'

import type { Channel, VoiceParticipantsResponse } from '@kakdela/ginzu/api-types'

import { wsClient } from '../../lib/ws.js'
import { listVoiceParticipants } from './api.js'

/**
 * Возвращает `Map<channelId, userIds[]>` для отрисовки мини-аватарок под
 * voice-каналами в сайдбаре.
 *
 * Источники истины:
 * 1. GET /api/voice/:id/participants — изначальный snapshot для каждого канала.
 * 2. WS-события voice.join / voice.leave — live-обновления; патчат соответ-
 *    ствующий queryData.
 *
 * GET /participants кэшируется на сервере 5 секунд (см. T-031), поэтому
 * частые обращения дёшевы. staleTime 30s — react-query не будет рефетчить
 * без нужды; WS заменяет polling.
 */
export function useVoiceChannelPresence(
  channels: Channel[],
): Map<string, string[]> {
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
      if (event.t !== 'voice.join' && event.t !== 'voice.leave') return
      queryClient.setQueryData<VoiceParticipantsResponse>(
        ['voiceParticipants', event.channelId],
        (old) => {
          const list = old?.participants ?? []
          if (event.t === 'voice.join') {
            if (list.some((p) => p.userId === event.userId)) return old
            // displayName ещё не знаем — заполнится при следующем рефетче
            // или через client-side member lookup при отрисовке. Сейчас не
            // блокирующая UI деталь.
            return {
              participants: [
                ...list,
                { userId: event.userId, displayName: '', isScreenSharing: false },
              ],
            }
          }
          return { participants: list.filter((p) => p.userId !== event.userId) }
        },
      )
    })
  }, [queryClient])

  return useMemo(() => {
    const map = new Map<string, string[]>()
    for (let i = 0; i < voiceChannels.length; i += 1) {
      const ch = voiceChannels[i]
      const q = queries[i]
      if (!ch) continue
      const ids = q?.data?.participants.map((p) => p.userId) ?? []
      map.set(ch.id, ids)
    }
    return map
  }, [voiceChannels, queries])
}
