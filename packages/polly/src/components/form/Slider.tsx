// Слайдер: label + значение (mono, accent) и полоса с заливкой и белой шайбой.
// Поверх кастомной полосы лежит невидимый нативный input[type=range] —
// обработчики, клавиатура и a11y остаются нативными.
// Источник паттерна: designs/final-settings.jsx (KD_Slider).

interface SliderProps {
  label: string
  /** Отформатированное значение справа («6 px», «140%»). */
  display: string
  value: number
  min: number
  max: number
  step?: number
  onChange(value: number): void
  /** Подпись mono под полосой. */
  hint?: React.ReactNode
  disabled?: boolean
  className?: string
}

export function Slider({
  label, display, value, min, max, step = 1, onChange, hint, disabled, className,
}: SliderProps) {
  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0

  return (
    <div className={`px-3.5 py-3 bg-kd-panel border border-kd-border rounded-kd ${className ?? ''}`}>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[12px] font-semibold text-kd-text">{label}</span>
        <span className="text-[11px] font-mono font-bold text-kd-accent">{display}</span>
      </div>
      <div className="relative h-1.5 rounded bg-kd-panel-hi">
        {/* проценты — runtime-значение, инлайн легитимен */}
        <div className="absolute left-0 top-0 h-full rounded bg-kd-accent" style={{ width: `${pct}%` }} />
        <div
          aria-hidden
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_0_2px_var(--kd-accent)] pointer-events-none"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-x-0 -inset-y-2 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>
      {hint && <div className="text-[10px] font-mono text-kd-text-mute mt-2">{hint}</div>}
    </div>
  )
}
