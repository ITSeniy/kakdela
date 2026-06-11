// Поле настроек: label mono uppercase + hint + контент.
// Источник паттерна: designs/final-settings.jsx (KD_SetField).

interface FieldProps {
  label: React.ReactNode
  /** Пояснение под label, обычным шрифтом. */
  hint?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <div className={className ?? ''}>
      <div className="text-[11px] font-mono font-bold uppercase tracking-[0.05em] text-kd-text mb-1">
        {label}
      </div>
      {hint && <div className="text-[11px] text-kd-text-soft mb-2">{hint}</div>}
      {children}
    </div>
  )
}
