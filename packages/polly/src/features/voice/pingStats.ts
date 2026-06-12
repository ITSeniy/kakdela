// Статистика соединения голосового канала: RTT и потери пакетов из
// WebRTC-статов локального мик-трека (candidate-pair / remote-inbound-rtp).
// Семплируем раз в 5с, держим окно 5 минут — для графика в VoiceDock.

import { useEffect, useRef } from 'react'
import { Track } from 'livekit-client'
import { create } from 'zustand'

import { getActiveRoom } from '../../lib/livekit.js'
import { useVoiceStore } from './store.js'

export interface PingSample {
  t: number
  /** RTT в мс; null — не удалось снять. */
  rtt: number | null
  /** Потери пакетов за интервал, % (0-100); null — нет данных. */
  loss: number | null
}

const WINDOW_MS = 5 * 60_000
export const SAMPLE_INTERVAL_MS = 5_000

interface PingStore {
  samples: PingSample[]
  push(sample: PingSample): void
  clear(): void
}

export const useVoicePing = create<PingStore>((set) => ({
  samples: [],
  push: (sample) =>
    set((s) => ({
      samples: [...s.samples.filter((x) => sample.t - x.t < WINDOW_MS), sample],
    })),
  clear: () => set({ samples: [] }),
}))

interface RawStats {
  rtt: number | null
  packetsSent: number
  packetsLost: number
}

async function readStats(): Promise<RawStats | null> {
  const room = getActiveRoom()
  const track = room?.localParticipant.getTrackPublication(Track.Source.Microphone)?.track
  if (!track) return null
  const report = await track.getRTCStatsReport?.()
  if (!report) return null

  let rtt: number | null = null
  let packetsSent = 0
  let packetsLost = 0
  report.forEach((stat) => {
    const s = stat as Record<string, unknown>
    if (
      s['type'] === 'candidate-pair'
      && (s['nominated'] === true || s['state'] === 'succeeded')
      && typeof s['currentRoundTripTime'] === 'number'
    ) {
      rtt = Math.round((s['currentRoundTripTime'] as number) * 1000)
    }
    if (s['type'] === 'outbound-rtp' && typeof s['packetsSent'] === 'number') {
      packetsSent += s['packetsSent'] as number
    }
    if (s['type'] === 'remote-inbound-rtp') {
      if (typeof s['packetsLost'] === 'number') packetsLost += s['packetsLost'] as number
      if (rtt === null && typeof s['roundTripTime'] === 'number') {
        rtt = Math.round((s['roundTripTime'] as number) * 1000)
      }
    }
  })
  return { rtt, packetsSent, packetsLost }
}

/** Семплер. Монтируется один раз в Shell; работает, пока подключены к ГС. */
export function useVoicePingSampler(): void {
  const status = useVoiceStore((s) => s.status)
  // Счётчики WebRTC кумулятивные — потери считаем по дельте между семплами.
  const prevRef = useRef<{ sent: number; lost: number } | null>(null)

  useEffect(() => {
    if (status !== 'connected') {
      prevRef.current = null
      useVoicePing.getState().clear()
      return
    }

    let cancelled = false
    async function sample() {
      const raw = await readStats()
      if (cancelled) return
      if (!raw) return
      const prev = prevRef.current
      let loss: number | null = null
      if (prev) {
        const dSent = raw.packetsSent - prev.sent
        const dLost = raw.packetsLost - prev.lost
        if (dSent > 0) loss = Math.max(0, Math.min(100, (dLost / (dSent + dLost)) * 100))
      }
      prevRef.current = { sent: raw.packetsSent, lost: raw.packetsLost }
      useVoicePing.getState().push({ t: Date.now(), rtt: raw.rtt, loss })
    }

    void sample()
    const timer = setInterval(() => { void sample() }, SAMPLE_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [status])
}
