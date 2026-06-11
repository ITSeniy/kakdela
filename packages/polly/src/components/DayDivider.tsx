// Разделитель дней в ленте сообщений: линия — label — линия.
// Источник: designs/final-chrome.jsx (KD_DayDivider).

interface DayDividerProps {
  label: string
  className?: string
}

export function DayDivider({ label, className }: DayDividerProps) {
  return (
    <div className={`flex items-center gap-2.5 px-4 pt-1 pb-1.5 select-none ${className ?? ''}`}>
      <div className="flex-1 h-px bg-kd-border" />
      <div className="text-[9px] font-mono text-kd-text-mute shrink-0">{label}</div>
      <div className="flex-1 h-px bg-kd-border" />
    </div>
  )
}
