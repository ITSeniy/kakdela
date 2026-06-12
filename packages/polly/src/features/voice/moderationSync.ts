// Реакция клиента на серверную модерацию голоса (WS voice.mod / voice.moved /
// voice.kicked). Подключается один раз в App. Два слоя:
//   1) если событие про МЕНЯ — применяем принудительное состояние к своей
//      сессии (заглушить мик, заглушить звук, перейти в канал, выйти);
//   2) для всех — патчим store участников активной комнаты, чтобы иконки
//      в тайлах и сайдбаре обновились (query-кэш presence патчит
//      useVoiceChannelPresence).

import { useEffect } from 'react'

import { toast } from '../../components/toast/index.js'
import { applyDeafenVolume, getActiveRoom } from '../../lib/livekit.js'
import { wsClient } from '../../lib/ws.js'
import { useAuthStore } from '../auth/store.js'
import { useVoiceInputSettings } from './inputSettings.js'
import { audioCaptureOptions } from './noiseSettings.js'
import { useVoiceStore } from './store.js'
import { joinVoiceRoom, leaveVoiceRoom } from './useVoiceRoom.js'

async function applyForcedToSelf(muted: boolean, deafened: boolean): Promise<void> {
  const store = useVoiceStore.getState()
  const wasForcedDeafened = store.forcedDeafened
  const room = getActiveRoom()
  store.setForced(muted, deafened)

  if (deafened) {
    store.setDeafened(true)
    applyDeafenVolume(room, true)
  } else if (wasForcedDeafened) {
    store.setDeafened(false)
    applyDeafenVolume(room, false)
  }

  if (muted) {
    store.setMuted(true)
    if (room) {
      try { await room.localParticipant.setMicrophoneEnabled(false) } catch { /* уже выключен */ }
    }
  } else if (
    store.muted
    // В PTT мик всегда «замьючен» и управляется клавишей — не трогаем.
    && useVoiceInputSettings.getState().inputMode !== 'push-to-talk'
  ) {
    // Админ снял мьют — включаем мик обратно (как Discord возвращает голос).
    store.setMuted(false)
    if (room) {
      try {
        await room.localParticipant.setMicrophoneEnabled(true, audioCaptureOptions())
      } catch { /* нет разрешения — пользователь включит сам */ }
    }
  }
}

export function useVoiceModerationSync(): void {
  useEffect(() => {
    return wsClient.on((event) => {
      if (event.t === 'voice.mod') {
        const me = useAuthStore.getState().user?.id
        const { activeChannelId, patchParticipant } = useVoiceStore.getState()
        if (event.channelId === activeChannelId) {
          patchParticipant(event.userId, {
            serverMuted: event.muted,
            serverDeafened: event.deafened,
          })
        }
        if (event.userId === me && event.channelId === activeChannelId) {
          const before = useVoiceStore.getState()
          void applyForcedToSelf(event.muted, event.deafened)
          if (event.deafened && !before.forcedDeafened) toast.info('админ выключил вам звук')
          else if (!event.deafened && before.forcedDeafened) toast.info('админ вернул вам звук')
          else if (event.muted && !before.forcedMuted) toast.info('админ заглушил вам микрофон')
          else if (!event.muted && before.forcedMuted) toast.info('админ вернул вам микрофон')
        }
        return
      }

      if (event.t === 'voice.moved') {
        const me = useAuthStore.getState().user?.id
        if (event.userId !== me) return
        if (useVoiceStore.getState().activeChannelId !== event.fromChannelId) return
        toast.info('админ перенёс вас в другой канал')
        void joinVoiceRoom(event.toChannelId)
        return
      }

      if (event.t === 'voice.kicked') {
        const me = useAuthStore.getState().user?.id
        if (event.userId !== me) return
        if (useVoiceStore.getState().activeChannelId !== event.channelId) return
        toast.info('админ отключил вас от голосового канала')
        void leaveVoiceRoom()
      }
    })
  }, [])
}
