import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { restartMicConstraints } from '../../lib/livekit.js'
import { useAudioDevices } from './deviceSettings.js'

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
  /** Эхоподавление (WebRTC AEC) — убирает эхо динамиков из микрофона. */
  echoCancellation: boolean
  /** Авторегулировка усиления (AGC) — выравнивает громкость голоса. */
  autoGainControl: boolean
}

interface NoiseSettingsActions {
  setNoiseSuppression(enabled: boolean): void
  toggleNoiseSuppression(): void
  setEchoCancellation(enabled: boolean): void
  setAutoGainControl(enabled: boolean): void
}

// Дефолты `true` — для типичного home-офиса с гудящим компьютером и
// открытым YouTube в соседней вкладке польза очевидна, а штраф по CPU
// ничтожен. На совсем слабых машинах или с внешней обработкой (аудиоинтерфейс,
// OBS) пользователь сам выключит.
export const useNoiseSettings = create<NoiseSettingsState & NoiseSettingsActions>()(
  persist(
    (set, get) => ({
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl:  true,
      setNoiseSuppression(enabled) { set({ noiseSuppression: enabled }) },
      toggleNoiseSuppression()     { set({ noiseSuppression: !get().noiseSuppression }) },
      setEchoCancellation(enabled) { set({ echoCancellation: enabled }) },
      setAutoGainControl(enabled)  { set({ autoGainControl: enabled }) },
    }),
    { name: 'kd:voice:noise' },
  ),
)

/**
 * Базовый набор audio constraints для микрофона. Возвращаем именно
 * AudioCaptureOptions, который LiveKit принимает в `setMicrophoneEnabled`
 * и `LocalAudioTrack.restartTrack`. Все три фильтра — по настройкам голоса
 * (дефолтно включены); продвинутые могут выключить эхо/AGC под свой тракт.
 */
export function audioCaptureOptions(): {
  noiseSuppression: boolean
  echoCancellation: boolean
  autoGainControl:  boolean
  deviceId?: string
} {
  const micId = useAudioDevices.getState().micId
  const s = useNoiseSettings.getState()
  return {
    noiseSuppression: s.noiseSuppression,
    echoCancellation: s.echoCancellation,
    autoGainControl:  s.autoGainControl,
    // 'default' — отдаём выбор браузеру, явный id — конкретное устройство.
    ...(micId && micId !== 'default' ? { deviceId: micId } : {}),
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
  const noiseSuppression = useNoiseSettings((s) => s.noiseSuppression)
  const echoCancellation = useNoiseSettings((s) => s.echoCancellation)
  const autoGainControl = useNoiseSettings((s) => s.autoGainControl)
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    void restartMicConstraints(audioCaptureOptions())
  }, [noiseSuppression, echoCancellation, autoGainControl])
}
