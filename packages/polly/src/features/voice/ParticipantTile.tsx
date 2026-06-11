import { useEffect, useRef } from 'react'

import type { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client'

import { Avatar } from '../../components/Avatar.js'
import { Icon } from '../../components/Icon.js'

interface ParticipantTileProps {
  displayName: string
  avatarUrl?: string | null
  muted: boolean
  speaking: boolean
  isSelf?: boolean
  /**
   * Screen-share video track (local или remote). Если передан — рендерим
   * <video> на месте аватара. Self-preview использует local track, чужие
   * tile'ы — remote после TrackSubscribed. В `compact` режиме (dock)
   * track игнорируется — screen-видео живёт в фокусе, не в dock'е.
   */
  screenTrack?: LocalVideoTrack | RemoteVideoTrack | null
  /**
   * Компактный вид для нижней полосы (dock) театрального режима — аватар
   * 48px, низкий tile, та же логика speaking ring / mute крестика.
   */
  compact?: boolean
}

// Размер аватара берём из размера тайла — крупные сетки дают мелкие тайлы.
// container-query пока не везде доступно в WebView2-shipped Chromium, поэтому
// просто фиксируем 96 — выглядит ок в любой сетке 1×1…3×3. Для compact-режима
// (dock в театральной раскладке) — в два раза меньше.
const AVATAR_SIZE = 96
const AVATAR_SIZE_COMPACT = 48

function ScreenVideo({ track, muted }: { track: LocalVideoTrack | RemoteVideoTrack; muted: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    track.attach(el)
    return () => {
      try { track.detach(el) } catch { /* SDK already detached */ }
    }
  }, [track])

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      // Self-preview MUST быть muted — иначе акустический фидбэк через
      // ScreenShareAudio. Для remote это решение caller'а (deafen).
      muted={muted}
      className="absolute inset-0 w-full h-full object-contain bg-kd-stage"
    />
  )
}

export function ParticipantTile({
  displayName,
  avatarUrl,
  muted,
  speaking,
  isSelf,
  screenTrack,
  compact,
}: ParticipantTileProps) {
  const avatarSize = compact ? AVATAR_SIZE_COMPACT : AVATAR_SIZE
  // В compact-режиме screen-track намеренно игнорируем: экран живёт в
  // ScreenTile в focus-области, а dock — это «лица», не «трансляции».
  const showScreen = !compact && !!screenTrack
  return (
    <div
      className={[
        'relative rounded-kd overflow-hidden flex items-center justify-center',
        'bg-kd-stage border border-kd-border',
        compact ? 'min-h-[80px]' : 'min-h-[140px]',
      ].join(' ')}
      style={{
        // Кольцо рисуем только через box-shadow — иначе смена border-style
        // вызывала бы 1-2px layout-сдвиг на каждое включение. Чистый CSS-
        // transition, без JS-анимации, чтобы не лагало на 20 тайлах.
        // Условный speaking-ring — легитимный инлайн (только var(--kd-*)).
        boxShadow: speaking
          ? '0 0 0 2px var(--kd-accent), var(--kd-shadow-tile)'
          : '0 0 0 0px var(--kd-accent), var(--kd-shadow-tile)',
        transition: 'box-shadow 200ms ease-out, transform 200ms ease-out',
        transform: speaking ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      {showScreen && screenTrack ? (
        <ScreenVideo track={screenTrack} muted={!!isSelf} />
      ) : (
        <Avatar
          name={displayName}
          avatarUrl={avatarUrl ?? null}
          size={avatarSize}
        />
      )}
      <div className="absolute left-1.5 bottom-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded font-mono bg-kd-overlay-strong text-kd-stage-text">
        {muted && <Icon.MicOff size={11} className="text-kd-dnd shrink-0" />}
        <span className="text-[10px] font-semibold">{displayName}</span>
        {isSelf && (
          <span className="text-[9px] font-bold text-kd-accent">· ВЫ</span>
        )}
      </div>
    </div>
  )
}
