import { useEffect, useRef, useState } from 'react'

import type { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client'

function formatQuality(track: LocalVideoTrack | RemoteVideoTrack): string | null {
  // dimensions есть и у Local- и у RemoteVideoTrack, но в публичных типах
  // SDK это не отражено. Читаем размеры через стандартный MediaTrackSettings
  // — он одинаков для обеих сторон.
  const settings = track.mediaStreamTrack?.getSettings()
  const h = settings?.height
  if (!h) return null
  const tier = h >= 1080 ? '1080p' : h >= 720 ? '720p' : h >= 480 ? '480p' : `${h}p`
  const fps = settings.frameRate
  return fps ? `${tier} · ${Math.round(fps)}fps` : tier
}

interface ScreenTileProps {
  displayName: string
  isSelf: boolean
  pinned: boolean
  busy?: boolean
  onTogglePin(): void
  onSnapshot(): void
  screenTrack: LocalVideoTrack | RemoteVideoTrack
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14l-2-9V3H7v5z" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

/**
 * Большой 16:9 tile с screen track. Видео attach'ится через LiveKit API —
 * SDK сам управляет `srcObject` и lifecycle. На unmount обязателен detach
 * (тот же track может оказаться в другом tile'е после ре-раскладки).
 *
 * Self-preview MUST быть muted: иначе ScreenShareAudio из своего же source'а
 * вернётся в наушники через спикеры. Для чужих экранов аудио рулится
 * deafen'ом на уровне Room (см. applyDeafenVolume).
 */
export function ScreenTile({
  displayName,
  isSelf,
  pinned,
  busy,
  onTogglePin,
  onSnapshot,
  screenTrack,
}: ScreenTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [quality, setQuality] = useState<string | null>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    screenTrack.attach(el)
    return () => {
      try { screenTrack.detach(el) } catch { /* SDK already detached */ }
    }
  }, [screenTrack])

  // Dimensions заполняются не сразу — первые кадры могут прийти через 100-500ms
  // после attach. Поллим раз в 250ms пока не получим валидный resolution; смена
  // quality preset в T-052 делает stop+start = unmount+mount, так что новый
  // tile сам перечитает актуальные размеры.
  useEffect(() => {
    let cancelled = false
    function read() {
      if (cancelled) return
      const q = formatQuality(screenTrack)
      if (q) { setQuality(q); return }
      setTimeout(read, 250)
    }
    read()
    return () => { cancelled = true }
  }, [screenTrack])

  const toggleFullscreen = (): void => {
    const container = containerRef.current
    if (!container) return
    if (document.fullscreenElement === container) {
      void document.exitFullscreen().catch(() => { /* ignore */ })
    } else {
      // requestFullscreen может реджектиться, если вызов не из user gesture
      // или fullscreen уже занят. Не паникуем — просто игнорируем.
      void container.requestFullscreen().catch(() => { /* ignore */ })
    }
  }

  return (
    <div
      ref={containerRef}
      onDoubleClick={toggleFullscreen}
      className="group relative rounded-kd overflow-hidden bg-kd-stage border border-kd-border shadow-kd-tile"
      style={{
        aspectRatio: '16 / 9',
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        className="absolute inset-0 w-full h-full object-contain"
      />

      {/* Имя + SHARE-бейдж — внизу-слева, всегда видны (designs/final-voice.jsx
          KD_StageTile). */}
      <div className="absolute left-2 bottom-2 flex items-center gap-1 px-1.5 py-0.5 rounded font-mono bg-kd-overlay-strong text-kd-stage-text">
        <span className="text-[10px] font-semibold">{displayName}</span>
        <span className="text-[9px] font-bold text-kd-accent">· SHARE</span>
      </div>

      {/* Hover-оверлей с кнопками. Прячем opacity'ью, чтобы не дёргать DOM
          на каждое движение мыши. */}
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (!busy) onSnapshot()
          }}
          disabled={busy}
          title={busy ? 'отправляется…' : 'снимок в чат'}
          className="inline-flex items-center justify-center w-6 h-6 rounded bg-kd-overlay-strong text-kd-stage-text disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CameraIcon />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin()
          }}
          title={pinned ? 'открепить демо' : 'закрепить демо на весь фокус'}
          className={[
            'inline-flex items-center justify-center w-6 h-6 rounded',
            pinned ? 'bg-kd-accent text-white' : 'bg-kd-overlay-strong text-kd-stage-text',
          ].join(' ')}
        >
          <PinIcon filled={pinned} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleFullscreen()
          }}
          title="на весь экран (двойной клик тоже работает)"
          className="inline-flex items-center justify-center w-6 h-6 rounded bg-kd-overlay-strong text-kd-stage-text"
        >
          <ExpandIcon />
        </button>
      </div>

      {/* Quality badge — resolution и fps текущего стрима, вверху-справа
          (final-voice.jsx:31-37). На hover там же появляются кнопки —
          бейдж в этот момент прячем, чтобы не пересекались. */}
      {quality && (
        <div className="absolute right-2 top-2 px-1.5 py-0.5 rounded font-mono bg-kd-overlay-strong text-kd-stage-text opacity-70 text-[9px] pointer-events-none group-hover:opacity-0 transition-opacity">
          {quality}
        </div>
      )}
    </div>
  )
}
