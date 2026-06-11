// Чип выбора цвета 38×38 с подписью mono и галочкой на выбранном.
// Источник паттерна: designs/final-settings.jsx (KD_Swatch).

interface SwatchProps {
  /** Цвет чипа — runtime-значение из prop, инлайн легитимен. */
  color: string
  label: string
  active?: boolean
  onClick?(): void
}

export function Swatch({ color, label, active, onClick }: SwatchProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active ?? false}
      aria-label={label}
      onClick={onClick}
      className="flex flex-col items-center gap-[5px] cursor-pointer"
    >
      <span
        className="w-[38px] h-[38px] rounded-kd flex items-center justify-center text-kd-stage-text text-[16px] font-bold select-none"
        style={{
          background: color,
          boxShadow: active
            ? `0 0 0 2px var(--kd-bg), 0 0 0 4px ${color}`
            : '0 0 0 1px var(--kd-border)',
        }}
      >
        {active ? '✓' : ''}
      </span>
      <span className="text-[10px] font-mono text-kd-text-soft">{label}</span>
    </button>
  )
}
