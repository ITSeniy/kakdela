// Бейджи: роль, LIVE, упоминание, счётчик непрочитанного.
// Источник: designs/final-chrome.jsx (role-badge, LIVE, unread/mention).

type BadgeVariant = 'role' | 'live' | 'mention' | 'count'

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  // «хоз» у имени: 8px, accent-soft фон, mono, uppercase
  role: 'text-[8px] px-1 py-px rounded bg-kd-accent-soft text-kd-accent-deep font-mono font-bold uppercase tracking-[0.05em]',
  // LIVE у голосового канала: accent фон, белый текст
  live: 'text-[8px] px-1 py-px rounded bg-kd-accent text-white font-mono font-bold uppercase tracking-[0.05em]',
  // Упоминание: тёплый фон, белый текст
  mention: 'text-[9px] min-w-[14px] px-1 py-px rounded bg-kd-warm text-white font-mono font-bold text-center leading-tight',
  // Просто число непрочитанного: жирное, без фона
  count: 'text-[10px] font-mono font-bold text-kd-text-soft',
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={`inline-block select-none shrink-0 ${VARIANT_CLASS[variant]} ${className ?? ''}`}>
      {children}
    </span>
  )
}
