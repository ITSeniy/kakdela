// Аудио-устройства и громкости (как в Discord, без профилей ввода):
// выбор микрофона/динамика, программное усиление микрофона (GainNode-
// процессор поверх трека) и общая громкость динамика (множитель к
// персональным громкостям участников). Применение live — useAudioDeviceSync.

import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  applyDeafenVolume,
  applyMicGainLive,
  applySpeakerDevice,
  getActiveRoom,
  restartMicConstraints,
} from '../../lib/livekit.js'
import { audioCaptureOptions } from './noiseSettings.js'
import { useVoiceStore } from './store.js'

interface AudioDeviceState {
  /** deviceId или 'default'. */
  micId: string
  speakerId: string
  /** Программное усиление микрофона, 0..2 (1 = без изменений). */
  micGain: number
  /** Общая громкость динамика, 0..1 — множитель к громкостям участников. */
  speakerVolume: number
  setMicId(id: string): void
  setSpeakerId(id: string): void
  setMicGain(gain: number): void
  setSpeakerVolume(volume: number): void
}

export const useAudioDevices = create<AudioDeviceState>()(
  persist(
    (set) => ({
      micId: 'default',
      speakerId: 'default',
      micGain: 1,
      speakerVolume: 1,
      setMicId: (micId) => set({ micId }),
      setSpeakerId: (speakerId) => set({ speakerId }),
      setMicGain: (micGain) => set({ micGain: Math.min(2, Math.max(0, micGain)) }),
      setSpeakerVolume: (speakerVolume) =>
        set({ speakerVolume: Math.min(1, Math.max(0, speakerVolume)) }),
    }),
    { name: 'kd:voice:devices' },
  ),
)

export interface AudioDeviceInfo {
  deviceId: string
  label: string
}

/** Список устройств. Если labels пустые (нет разрешения) — попросим мик
    один раз, иначе селекты бесполезны. */
export async function listAudioDevices(): Promise<{
  mics: AudioDeviceInfo[]
  speakers: AudioDeviceInfo[]
}> {
  let devices = await navigator.mediaDevices.enumerateDevices()
  const noLabels = devices.filter((d) => d.kind === 'audioinput').every((d) => !d.label)
  if (noLabels) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      devices = await navigator.mediaDevices.enumerateDevices()
    } catch { /* не дали разрешение — покажем безымянные */ }
  }
  const named = (d: MediaDeviceInfo, i: number, kind: string) => ({
    deviceId: d.deviceId,
    label: d.label || `${kind} ${i + 1}`,
  })
  return {
    mics: devices.filter((d) => d.kind === 'audioinput').map((d, i) => named(d, i, 'микрофон')),
    speakers: devices.filter((d) => d.kind === 'audiooutput').map((d, i) => named(d, i, 'динамик')),
  }
}

/** Монтируется один раз в Shell: применяет смену устройств/громкостей
    к живой комнате. */
export function useAudioDeviceSync(): void {
  const micId = useAudioDevices((s) => s.micId)
  const speakerId = useAudioDevices((s) => s.speakerId)
  const micGain = useAudioDevices((s) => s.micGain)
  const speakerVolume = useAudioDevices((s) => s.speakerVolume)
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) return
    void restartMicConstraints(audioCaptureOptions())
  }, [micId])

  useEffect(() => {
    if (firstRun.current) return
    void applySpeakerDevice()
  }, [speakerId])

  useEffect(() => {
    if (firstRun.current) return
    void applyMicGainLive()
  }, [micGain])

  useEffect(() => {
    if (firstRun.current) return
    applyDeafenVolume(getActiveRoom(), useVoiceStore.getState().deafened)
  }, [speakerVolume])

  // Ставим флаг ПОСЛЕ первого прохода всех эффектов выше.
  useEffect(() => {
    firstRun.current = false
  }, [])
}
