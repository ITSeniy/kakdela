// Hover-превью демки участника (как в Discord): при наведении на стримящего в
// списке голосового канала показываем живой кадр его экрана. Для чужих демок
// делаем временную подписку на видео-трек (setScreenPreview) — adaptiveStream
// отдаёт низкий layer под маленький <video>, так что трафик щадящий. Для своей
// демки берём локальный трек и подписываем «Вы стримите!».

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client'

import { getLocalScreenVideoTrack, getRemoteScreenVideoTrack, setScreenPreview } from '../../lib/livekit.js'

const CARD_W = 300
const CARD_H = 232

interface ScreenHoverPreviewProps {
  userId: string
  displayName: string
  isSelf: boolean
  /** Прямоугольник строки-якоря (для позиционирования карточки). */
  anchor: DOMRect
}

function computePosition(anchor: DOMRect): { left: number; top: number } {
  const gap = 8
  let left = anchor.right + gap
  if (left + CARD_W > window.innerWidth - gap) {
    // Не влезает справа — показываем слева от строки.
    left = Math.max(gap, anchor.left - CARD_W - gap)
  }
  const top = Math.min(
    Math.max(gap, anchor.top - 4),
    window.innerHeight - CARD_H - gap,
  )
  return { left, top }
}

export function ScreenHoverPreview({ userId, displayName, isSelf, anchor }: ScreenHoverPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [track, setTrack] = useState<LocalVideoTrack | RemoteVideoTrack | null>(null)

  // Достаём трек: свой — сразу, чужой — после временной подписки (поллим,
  // пока LiveKit не подпишет трек, максимум ~3 сек).
  useEffect(() => {
    if (isSelf) {
      setTrack(getLocalScreenVideoTrack())
      return
    }
    setScreenPreview(userId, true)
    let cancelled = false
    let tries = 0
    const tick = () => {
      if (cancelled) return
      const t = getRemoteScreenVideoTrack(userId)
      if (t) { setTrack(t); return }
      if (tries++ < 15) setTimeout(tick, 200)
    }
    tick()
    return () => {
      cancelled = true
      setScreenPreview(userId, false)
    }
  }, [userId, isSelf])

  // Attach/detach видео-трека к элементу.
  useEffect(() => {
    const el = videoRef.current
    if (!el || !track) return
    track.attach(el)
    return () => { try { track.detach(el) } catch { /* already detached */ } }
  }, [track])

  const { left, top } = computePosition(anchor)

  return createPortal(
    <div
      className="fixed z-50 rounded-xl border border-kd-border bg-kd-panel shadow-kd-modal overflow-hidden pointer-events-none select-none"
      style={{ left, top, width: CARD_W }}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-kd-panel-alt border-b border-kd-border">
        <span className="text-[11px] font-semibold text-kd-text">сейчас стримит</span>
        <span className="px-1.5 py-0.5 rounded bg-kd-danger text-white text-[9px] font-bold font-mono uppercase tracking-wide">
          в эфире
        </span>
      </div>
      <div className="relative w-full bg-kd-stage" style={{ height: CARD_W * 9 / 16 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-contain"
        />
        {!track && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-mono text-kd-stage-text/70">
            загрузка превью…
          </div>
        )}
      </div>
      <div className="px-3 py-2 bg-kd-panel-alt border-t border-kd-border flex items-center justify-center gap-1.5">
        {isSelf ? (
          <span className="text-[11px] font-semibold text-kd-warm">▶ Вы стримите!</span>
        ) : (
          <span className="text-[11px] text-kd-text-soft truncate">{displayName}</span>
        )}
      </div>
    </div>,
    document.body,
  )
}
