// Веб-камера в звонке. Тонкая обёртка над LiveKit setCameraEnabled — трек
// Track.Source.Camera публикуется и авто-подписывается у остальных (в отличие
// от демки, которая opt-in). store.cameraOn проставляется из LocalTrackPublished
// listener'а (см. lib/livekit.ts), а не отсюда — чтобы state совпадал с реальной
// публикацией даже если камеру отрубили вне нашего клика.

import { useCallback } from 'react'

import { getActiveRoom } from '../../lib/livekit.js'
import { useVoiceStore } from './store.js'

export interface UseCamera {
  startCamera(): Promise<void>
  stopCamera(): Promise<void>
}

export function useCamera(): UseCamera {
  const startCamera = useCallback(async (): Promise<void> => {
    const room = getActiveRoom()
    if (!room) return
    try {
      await room.localParticipant.setCameraEnabled(true)
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      // Esc/Cancel в системном запросе — штатный выход, не ошибка.
      if (name === 'NotAllowedError') {
        useVoiceStore.getState().setError('no-camera-permission')
        return
      }
      if (name === 'NotReadableError') {
        useVoiceStore.getState().setError('camera-busy')
        return
      }
      console.warn('[voice] camera enable failed', err)
      useVoiceStore.getState().setError('camera-failed')
    }
  }, [])

  const stopCamera = useCallback(async (): Promise<void> => {
    const room = getActiveRoom()
    if (!room) return
    try {
      await room.localParticipant.setCameraEnabled(false)
    } catch (err) {
      // Stop редко падает; store обновится из LocalTrackUnpublished.
      console.warn('[voice] camera disable failed', err)
    }
  }, [])

  return { startCamera, stopCamera }
}
