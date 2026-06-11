// Пустое состояние: glyph в dashed-квадрате + заголовок + текст + CTA.
// Источник: designs/final-extras.jsx (FinalEmpties / KD_Empty).

interface EmptyStateProps {
  /** Крупный символ/эмодзи в квадрате. */
  glyph: React.ReactNode
  title: string
  body?: string
  /** CTA-кнопка (уже свёрстанная) или любой узел под текстом. */
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ glyph, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center gap-3 ${className ?? ''}`}>
      <div className="w-[72px] h-[72px] rounded-kd border-2 border-dashed border-kd-border bg-kd-accent-bg flex items-center justify-center text-[28px] select-none">
        {glyph}
      </div>
      <div className="text-[16px] font-bold text-kd-text">{title}</div>
      {body && (
        <div className="text-[12px] text-kd-text-soft leading-relaxed whitespace-pre-line max-w-[260px]">
          {body}
        </div>
      )}
      {action}
    </div>
  )
}
