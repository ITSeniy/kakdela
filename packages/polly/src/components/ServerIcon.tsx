import { useMemo } from 'react'

import { pickServerColor } from './palette.js'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '?').toUpperCase()
  const a = parts[0]?.[0] ?? ''
  const b = parts[1]?.[0] ?? ''
  return (a + b).toUpperCase()
}

interface ServerIconProps {
  name: string
  iconUrl?: string | null
  active?: boolean
  hasUnread?: boolean
  unreadCount?: number
  onClick?: () => void
  size?: number
  title?: string
}

export function ServerIcon({
  name, iconUrl, active = false, hasUnread = false, unreadCount,
  onClick, size = 36, title,
}: ServerIconProps) {
  const color = useMemo(() => pickServerColor(name), [name])
  const initials = useMemo(() => initialsOf(name), [name])

  return (
    <div className="relative" title={title ?? name}>
      {/* Вертикальная полоса active-сервера (designs/final-chrome.jsx) */}
      {active && (
        <div
          className="absolute top-1/2 -translate-y-1/2 bg-kd-accent rounded-r"
          style={{ left: -10, width: 3, height: size * 0.7 }}
        />
      )}
      <button
        type="button"
        onClick={onClick}
        className={[
          'rounded-kd flex items-center justify-center text-kd-stage-text font-bold select-none',
          'hover:opacity-95 transition-shadow',
          active ? 'shadow-kd-ring-active' : '',
        ].join(' ')}
        style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
      >
        {iconUrl ? (
          <img src={iconUrl} alt="" className="w-full h-full rounded-kd object-cover" />
        ) : (
          initials
        )}
      </button>
      {hasUnread && (
        <div
          className="absolute -top-1 -right-1 bg-kd-warm text-white text-[9px] font-bold font-mono rounded px-1 border-[1.5px] border-kd-bg-deep min-w-[14px] text-center leading-tight"
        >
          {unreadCount && unreadCount > 0 ? unreadCount : '·'}
        </div>
      )}
    </div>
  )
}
