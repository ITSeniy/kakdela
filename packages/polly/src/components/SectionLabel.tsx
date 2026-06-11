// Заголовок секции списка: UPPERCASE, mono, 10px, приглушённый.
// Источник: designs/final-chrome.jsx (категории каналов, группы MemberList).

interface SectionLabelProps {
  children: React.ReactNode
  /** Кнопка/иконка справа (например, «+» создания канала). */
  action?: React.ReactNode
  className?: string
}

export function SectionLabel({ children, action, className }: SectionLabelProps) {
  return (
    <div className={`flex items-center gap-1 px-2 pt-3 pb-1 ${className ?? ''}`}>
      <div className="flex-1 min-w-0 text-[10px] font-mono font-bold uppercase tracking-[0.04em] text-kd-text-mute truncate select-none">
        {children}
      </div>
      {action}
    </div>
  )
}
