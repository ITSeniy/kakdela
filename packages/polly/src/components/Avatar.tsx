import { useMemo } from 'react'

import { pickAvatarColor } from './palette.js'
import { type Status } from './StatusDot.js'

const STATUS_VAR: Record<Status, string> = {
  online:  'var(--kd-online)',
  idle:    'var(--kd-idle)',
  dnd:     'var(--kd-dnd)',
  offline: 'var(--kd-text-mute)',
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase()
}

interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: number
  status?: Status
  className?: string
  /** Цвет подложки статус-точки (фон, на котором лежит аватар). */
  ringColor?: string
  /** Цвет кольца выделения вокруг аватара (speaking/active), как в common.jsx. */
  ring?: string
}

export function Avatar({ name, avatarUrl, size = 32, status, className, ringColor, ring }: AvatarProps) {
  const color = useMemo(() => pickAvatarColor(name), [name])
  const initials = useMemo(() => initialsOf(name), [name])
  // Компактная статус-точка с тонкой обводкой под цвет фона
  // (designs/final-chrome.jsx, KD_MemberList: 9px с border 2px на аватаре 24).
  const dotSize = Math.min(10, Math.max(8, Math.round(size * 0.34)))
  const ringShadow = ring
    ? `0 0 0 2px ${ringColor ?? 'var(--kd-panel)'}, 0 0 0 4px ${ring}`
    : undefined

  return (
    <div
      className={`relative shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="w-full h-full rounded-full object-cover"
          style={{ boxShadow: ringShadow }}
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-kd-stage-text font-semibold select-none"
          style={{ background: color, fontSize: size * 0.4, letterSpacing: '-0.02em', boxShadow: ringShadow }}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className="absolute rounded-full"
          style={{
            bottom: -1, right: -1,
            width: dotSize, height: dotSize,
            background: STATUS_VAR[status],
            border: `2px solid ${ringColor ?? 'var(--kd-panel)'}`,
          }}
        />
      )}
    </div>
  )
}
