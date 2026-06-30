import { useEffect, useState } from 'react'

import {
  getAudioCaptureCapability,
  type AudioCaptureCapability,
} from '../../lib/host/audioCapture.js'

// Возможности ОС за время сессии не меняются (билд Windows не обновляется на
// лету), поэтому пробуем один раз и кэшируем результат на уровне модуля.
let cached: AudioCaptureCapability | null = null
let inflight: Promise<AudioCaptureCapability> | null = null

function load(): Promise<AudioCaptureCapability> {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = getAudioCaptureCapability().then((cap) => {
      cached = cap
      return cap
    })
  }
  return inflight
}

/**
 * Возможности нативного захвата звука (T-094). `null` — пока пробуем; затем
 * стабильный объект на всё время сессии. На web/не-Windows — `mode: 'unsupported'`.
 */
export function useAudioCaptureCapability(): AudioCaptureCapability | null {
  const [cap, setCap] = useState<AudioCaptureCapability | null>(cached)
  useEffect(() => {
    let alive = true
    void load().then((c) => {
      if (alive) setCap(c)
    })
    return () => {
      alive = false
    }
  }, [])
  return cap
}
