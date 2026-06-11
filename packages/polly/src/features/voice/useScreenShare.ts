import { useCallback } from 'react'
import {
  ScreenSharePresets,
  Track,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
  type VideoPreset,
} from 'livekit-client'

import { getActiveRoom } from '../../lib/livekit.js'
import {
  useScreenShareSettings,
  type ScreenQuality,
} from './screenShareSettings.js'
import { useVoiceStore } from './store.js'

export interface UseScreenShare {
  /**
   * Запросить системный picker и начать публикацию screen track. Резолвится
   * после успешной публикации; store.screenSharing проставится из
   * LocalTrackPublished listener'а, а не отсюда — это держит state
   * согласованным с реальной комнатой даже при остановке через нативный bar.
   *
   * Если `withAudio` опущен — берём пользовательскую настройку из
   * `useScreenShareSettings`. На платформах, где захват системного звука
   * не работает (см. T-050a), `audioCaptureSupported` останется/станет
   * false после первой попытки.
   */
  startShare(opts?: { withAudio?: boolean }): Promise<void>
  stopShare(): Promise<void>
  /**
   * Перезапустить активную трансляцию с актуальным preset'ом качества.
   * Реализовано как stop → start, поэтому picker появится снова — это
   * ожидаемая цена смены параметров на лету (LiveKit не умеет менять
   * resolution без рекапчи source'а).
   */
  restartShare(): Promise<void>
}

interface ResolvedQuality {
  capture: ScreenShareCaptureOptions
  publish?: TrackPublishOptions
}

function presetToConfig(preset: VideoPreset): ResolvedQuality {
  return {
    capture: {
      resolution: {
        width: preset.width,
        height: preset.height,
        frameRate: preset.encoding.maxFramerate,
      },
    },
    publish: {
      videoEncoding: {
        maxBitrate: preset.encoding.maxBitrate,
        maxFramerate: preset.encoding.maxFramerate,
      },
    },
  }
}

/**
 * Маппит наш user-facing preset в `ScreenShareCaptureOptions` (resolution) +
 * `TrackPublishOptions` (bitrate, simulcast). Bitrate важно тащить отдельно —
 * resolution-only в Chromium может отдать поток на ~3 Mbps даже для 720p,
 * пока ему явно не сказано иначе.
 */
function configForQuality(q: ScreenQuality): ResolvedQuality {
  switch (q) {
    case 'auto':
      // SFU отдаёт более слабому клиенту меньшую раскладку без вмешательства
      // source'а. Capture без явного resolution — пусть Chromium возьмёт
      // дефолтные 1080p, simulcast вырежет два уровня.
      return {
        capture: {},
        publish: {
          screenShareSimulcastLayers: [
            ScreenSharePresets.h360fps15,
            ScreenSharePresets.h720fps30,
          ],
        },
      }
    case '1080p30':
      return presetToConfig(ScreenSharePresets.h1080fps30)
    case '720p30':
      return presetToConfig(ScreenSharePresets.h720fps30)
    case '720p15':
      return presetToConfig(ScreenSharePresets.h720fps15)
  }
}

/**
 * LiveKit прячет `getDisplayMedia` за `setScreenShareEnabled` — НЕ вызывай
 * MediaDevices напрямую. В WebView2 на Windows picker откроется внутри окна
 * (как в Chromium), на проде — нативный системный chooser. Поведение
 * одинаково с точки зрения нашего кода.
 */
export function useScreenShare(): UseScreenShare {
  const startShare = useCallback(
    async (opts: { withAudio?: boolean } = {}): Promise<void> => {
      const room = getActiveRoom()
      if (!room) return

      const settings = useScreenShareSettings.getState()
      // Если caller не сказал — берём пользовательскую настройку. Если уже
      // известно, что аудио не поддерживается (`audioCaptureSupported === false`),
      // не пытаемся его запросить вообще: иначе getDisplayMedia может в
      // некоторых билдах WebView2 ругаться на audio constraint.
      const wantsAudio = opts.withAudio ?? settings.withAudio
      const withAudio = wantsAudio && settings.audioCaptureSupported !== false
      const quality = configForQuality(settings.screenQuality)

      try {
        await room.localParticipant.setScreenShareEnabled(
          true,
          { ...quality.capture, audio: withAudio },
          quality.publish,
        )
      } catch (err) {
        const name = err instanceof Error ? err.name : ''

        // user закрыл picker (Esc / «Cancel») — это штатный выход, не ошибка.
        // Никаких toast'ов, кнопка просто возвращается в idle.
        if (name === 'NotAllowedError') return

        if (name === 'NotReadableError') {
          useVoiceStore.getState().setError('screen-source-busy')
          return
        }

        // Браузер не смог удовлетворить наши hints. Если просили audio —
        // в первую очередь подозреваем audio constraint (T-050a: на ряде
        // WebView2-сборок Win10/11 audio capture проблемный). Снимаем audio
        // и пробуем снова; в случае успеха помечаем платформу как не
        // поддерживающую захват системного звука.
        if (name === 'OverconstrainedError' || name === 'NotSupportedError') {
          if (withAudio) {
            try {
              await room.localParticipant.setScreenShareEnabled(
                true,
                { ...quality.capture, audio: false },
                quality.publish,
              )
              useScreenShareSettings.getState().setAudioCaptureSupported(false)
              return
            } catch (retryErr) {
              console.warn('[voice] screen share audio-fallback failed', retryErr)
              useVoiceStore.getState().setError('screen-share-failed')
              return
            }
          }
          // Без audio тоже не получилось — пробуем без всяких constraints,
          // чтобы хотя бы что-то опубликовалось (resolution preset'а мог
          // не подойти конкретному дисплею).
          try {
            await room.localParticipant.setScreenShareEnabled(true)
            return
          } catch (retryErr) {
            console.warn('[voice] screen share fallback failed', retryErr)
            useVoiceStore.getState().setError('screen-share-failed')
            return
          }
        }

        console.warn('[voice] screen share failed', err)
        useVoiceStore.getState().setError('screen-share-failed')
        return
      }

      // Capability-зонд: попросили audio, успешно опубликовались — проверяем,
      // приехал ли вообще ScreenShareAudio. В Chromium на некоторых
      // источниках (окно без воспроизведения, Linux webkit2gtk) audio
      // молча НЕ публикуется, ошибки нет. Если так — кэшируем флаг, чтобы
      // UI не врал в следующий раз.
      if (withAudio) {
        const audioPub = room.localParticipant.getTrackPublication(
          Track.Source.ScreenShareAudio,
        )
        useScreenShareSettings.getState().setAudioCaptureSupported(!!audioPub)
      }
    },
    [],
  )

  const stopShare = useCallback(async (): Promise<void> => {
    const room = getActiveRoom()
    if (!room) return
    try {
      await room.localParticipant.setScreenShareEnabled(false)
    } catch (err) {
      // Stop редко падает (LiveKit просто unpublish'ит), но если — лог и
      // ничего больше: store обновится из LocalTrackUnpublished когда трек
      // действительно отвалится.
      console.warn('[voice] screen stop failed', err)
    }
  }, [])

  const restartShare = useCallback(async (): Promise<void> => {
    const room = getActiveRoom()
    if (!room) return
    const sharing = useVoiceStore.getState().screenSharing
    if (!sharing) return
    await stopShare()
    // Дать LiveKit зафиналить unpublish: серверный SFU должен снять подписки
    // у зрителей до того, как мы опубликуем новый track тем же source'ом.
    // На практике хватает ~250ms; больше — заметная пауза для зрителей.
    await new Promise<void>((r) => setTimeout(r, 250))
    await startShare()
  }, [startShare, stopShare])

  return { startShare, stopShare, restartShare }
}
