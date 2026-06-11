import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { restartMicConstraints } from '../../lib/livekit.js'

interface NoiseSettingsState {
  /**
   * Шумоподавление микрофона. Реализовано через MediaTrackConstraints
   * `noiseSuppression`: браузер (Chromium / Firefox) пропускает поток через
   * собственный фильтр (WebRTC NS3 в Chromium, ~5% одного ядра на ноутбуке).
   *
   * RNNoise-WASM пайплайн (см. T-085 hints) даёт более агрессивное подавление
   * клавиатуры и не-стационарного шума, но требует AudioWorklet + WASM glue;
   * добавляется как «pro»-режим уже поверх этого toggle.
   */
  noiseSuppression: boolean
}

interface NoiseSettingsActions {
  setNoiseSuppression(enabled: boolean): void
  toggleNoiseSuppression(): void
}

// Дефолт `true` — для типичного home-офиса с гудящим компьютером и
// открытым YouTube в соседней вкладке польза очевидна, а штраф по CPU
// ничтожен. На совсем слабых машинах пользователь сам выключит.
export const useNoiseSettings = create<NoiseSettingsState & NoiseSettingsActions>()(
  persist(
    (set, get) => ({
      noiseSuppression: true,
      setNoiseSuppression(enabled) { set({ noiseSuppression: enabled }) },
      toggleNoiseSuppression()     { set({ noiseSuppression: !get().noiseSuppression }) },
    }),
    { name: 'kd:voice:noise' },
  ),
)

/**
 * Базовый набор audio constraints для микрофона. Возвращаем именно
 * AudioCaptureOptions, который LiveKit принимает в `setMicrophoneEnabled`
 * и `LocalAudioTrack.restartTrack`. Эхо и AGC всегда включены — выключать
 * их некому смысла, это плохо для голосовой связи без отдельной обработки.
 */
export function audioCaptureOptions(): {
  noiseSuppression: boolean
  echoCancellation: boolean
  autoGainControl:  boolean
} {
  return {
    noiseSuppression: useNoiseSettings.getState().noiseSuppression,
    echoCancellation: true,
    autoGainControl:  true,
  }
}

/**
 * Подключается один раз в Shell. Если пользователь дёрнет тоггл во время
 * активного звонка — перезапускаем существующий mic-трек с новыми
 * constraints через `LocalAudioTrack.restartTrack`. Публикация и mute-state
 * сохраняются (LiveKit под капотом делает replaceTrack на RTCRtpSender),
 * собеседники не услышат glitch'а.
 *
 * Первый эффект-проход (mount) пропускаем — там просто инициализация
 * значения из persist, никакого пользовательского действия не было.
 */
export function useNoiseSuppressionSync(): void {
  const enabled = useNoiseSettings((s) => s.noiseSuppression)
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    void restartMicConstraints(audioCaptureOptions())
  }, [enabled])
}
